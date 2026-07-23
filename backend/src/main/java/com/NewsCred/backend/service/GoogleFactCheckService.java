package com.NewsCred.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Live claim verification via the Google Fact Check Tools API.
 * https://developers.google.com/fact-check/tools/api
 *
 * This searches a global database of published fact-checks from
 * organizations like Snopes, PolitiFact, AFP, Reuters, Full Fact, etc.
 *
 * DESIGN NOTES:
 * - Free API, but requires GOOGLE_FACTCHECK_API_KEY (from Google Cloud).
 * - Coverage is limited to claims fact-checkers have actually reviewed,
 *   so "no matches" is common and is NOT evidence an article is true or
 *   false. We treat matches as strong signals and absence as neutral.
 * - Every call is wrapped in a timeout + try/catch so a demo without
 *   internet degrades gracefully instead of failing the analysis.
 */
@Service
public class GoogleFactCheckService {

    private static final String API_URL = "https://factchecktools.googleapis.com/v1alpha1/claims:search";
    private static final int MAX_CLAIMS_TO_CHECK = 4;
    private static final int MAX_MATCHES_PER_CLAIM = 3;
    private static final Duration TIMEOUT = Duration.ofSeconds(6);

    private final WebClient webClient;

    @Value("${google.factcheck.api-key:}")
    private String apiKey;

    public GoogleFactCheckService() {
        this.webClient = WebClient.builder().build();
    }

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isEmpty();
    }

    /** Result of checking one claim against the live database. */
    public static class ExternalClaimMatch {
        private String articleClaim;      // the sentence from the analyzed article
        private String matchedClaim;      // the claim text as reviewed by the fact-checker
        private String publisher;         // e.g. "PolitiFact"
        private String rating;            // e.g. "False", "Mostly true"
        private String reviewUrl;         // link to the fact-check article
        private double ratingScore;       // 0.0 (false) .. 1.0 (true), 0.5 unknown

        public String getArticleClaim() { return articleClaim; }
        public void setArticleClaim(String v) { this.articleClaim = v; }
        public String getMatchedClaim() { return matchedClaim; }
        public void setMatchedClaim(String v) { this.matchedClaim = v; }
        public String getPublisher() { return publisher; }
        public void setPublisher(String v) { this.publisher = v; }
        public String getRating() { return rating; }
        public void setRating(String v) { this.rating = v; }
        public String getReviewUrl() { return reviewUrl; }
        public void setReviewUrl(String v) { this.reviewUrl = v; }
        public double getRatingScore() { return ratingScore; }
        public void setRatingScore(double v) { this.ratingScore = v; }
    }

    public static class ExternalFactCheckResult {
        private boolean attempted;        // did we even try (key configured)?
        private boolean available;        // did the API respond?
        private List<ExternalClaimMatch> matches = new ArrayList<>();

        public boolean isAttempted() { return attempted; }
        public void setAttempted(boolean v) { this.attempted = v; }
        public boolean isAvailable() { return available; }
        public void setAvailable(boolean v) { this.available = v; }
        public List<ExternalClaimMatch> getMatches() { return matches; }

        /** Average truthfulness of matched claims (0..1), or -1 if none. */
        public double averageRatingScore() {
            if (matches.isEmpty()) return -1;
            return matches.stream().mapToDouble(ExternalClaimMatch::getRatingScore).average().orElse(-1);
        }

        public boolean hasFalseMatch() {
            return matches.stream().anyMatch(m -> m.getRatingScore() <= 0.25);
        }
    }

    /**
     * Check the given claims against the live fact-check database.
     * Never throws: on any failure returns a result with available=false.
     */
    public ExternalFactCheckResult checkClaims(List<String> claims) {
        ExternalFactCheckResult result = new ExternalFactCheckResult();

        if (!isConfigured()) {
            result.setAttempted(false);
            result.setAvailable(false);
            return result;
        }
        result.setAttempted(true);

        boolean anyResponse = false;
        int checked = 0;
        for (String claim : claims) {
            if (checked >= MAX_CLAIMS_TO_CHECK) break;
            checked++;
            try {
                String query = buildQuery(claim);
                if (query.isEmpty()) continue;

                String uri = UriComponentsBuilder.fromHttpUrl(API_URL)
                    .queryParam("query", query)
                    .queryParam("languageCode", "en")
                    .queryParam("pageSize", MAX_MATCHES_PER_CLAIM)
                    .queryParam("key", apiKey)
                    .build()
                    .toUriString();

                JsonNode response = webClient.get()
                    .uri(uri)
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .timeout(TIMEOUT)
                    .block();

                anyResponse = true;
                if (response == null || !response.has("claims")) continue;

                for (JsonNode claimNode : response.get("claims")) {
                    JsonNode reviews = claimNode.path("claimReview");
                    if (!reviews.isArray() || reviews.isEmpty()) continue;
                    JsonNode review = reviews.get(0);

                    ExternalClaimMatch match = new ExternalClaimMatch();
                    match.setArticleClaim(truncate(claim, 160));
                    match.setMatchedClaim(truncate(claimNode.path("text").asText(""), 200));
                    match.setPublisher(review.path("publisher").path("name").asText("Unknown"));
                    match.setRating(review.path("textualRating").asText("Unrated"));
                    match.setReviewUrl(review.path("url").asText(""));
                    match.setRatingScore(mapRatingToScore(match.getRating()));
                    result.getMatches().add(match);

                    if (result.getMatches().size() >= MAX_CLAIMS_TO_CHECK * 2) break;
                }
            } catch (Exception e) {
                // Timeout / network / quota - skip this claim, keep going
            }
        }

        result.setAvailable(anyResponse);
        return result;
    }

    /** Distill a sentence into a compact search query (key terms only). */
    private String buildQuery(String claim) {
        if (claim == null) return "";
        String cleaned = claim.replaceAll("[^a-zA-Z0-9\\s]", " ")
                              .replaceAll("\\s+", " ")
                              .trim();
        String[] words = cleaned.split(" ");
        if (words.length <= 10) return cleaned;
        // Keep the most informative chunk (first 10 non-trivial words)
        StringBuilder sb = new StringBuilder();
        int kept = 0;
        for (String w : words) {
            if (w.length() <= 2) continue;
            sb.append(w).append(" ");
            if (++kept >= 10) break;
        }
        return sb.toString().trim();
    }

    /** Map fact-checker verdict language to a 0..1 truthfulness score. */
    private double mapRatingToScore(String rating) {
        if (rating == null) return 0.5;
        String r = rating.toLowerCase(Locale.ROOT);
        if (r.contains("pants on fire") || r.contains("fabricat")) return 0.0;
        if (r.contains("mostly false") || r.contains("mainly false")) return 0.2;
        if (r.contains("false") || r.contains("incorrect") || r.contains("fake")
            || r.contains("hoax") || r.contains("debunk")) return 0.1;
        if (r.contains("misleading") || r.contains("distort") || r.contains("exaggerat")
            || r.contains("out of context") || r.contains("missing context")) return 0.3;
        if (r.contains("half true") || r.contains("half-true") || r.contains("mixture")
            || r.contains("mixed") || r.contains("partly")) return 0.5;
        if (r.contains("mostly true") || r.contains("mainly true")) return 0.8;
        if (r.contains("true") || r.contains("correct") || r.contains("accurate")) return 0.9;
        if (r.contains("unproven") || r.contains("unverified") || r.contains("research in progress")) return 0.4;
        return 0.5;
    }

    private String truncate(String s, int max) {
        if (s == null) return "";
        return s.length() <= max ? s : s.substring(0, max - 1) + "…";
    }
}
