package com.NewsCred.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

@Service
public class FactCheckApiService {

    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    // List of trusted fact-checking organizations
    private static final List<String> FACT_CHECK_ORGANIZATIONS = List.of(
        "Snopes", "FactCheck.org", "PolitiFact", "Reuters Fact Check",
        "AP Fact Check", "BBC Reality Check", "Full Fact", "AFP Fact Check",
        "USA Today Fact Check", "Washington Post Fact Checker"
    );

    public FactCheckApiService() {
        this.webClient = WebClient.builder()
                .defaultHeader("User-Agent", "NewsCred/1.0")
                .build();
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Extract claims from article content
     */
    public List<String> extractClaims(String content) {
        List<String> claims = new ArrayList<>();
        if (content == null) return claims;

        String lowerContent = content.toLowerCase();
        
        // Look for claim indicators
        String[] claimPatterns = {
            "according to", "source says", "reports suggest", "research shows",
            "study found", "evidence indicates", "claimed that", "stated that",
            "announced that", "confirmed that", "denied that", "alleged that",
            "scientists say", "experts warn", "officials confirm"
        };

        // Extract sentences containing claims
        String[] sentences = content.split("[.!?]");
        for (String sentence : sentences) {
            String trimmed = sentence.trim();
            if (trimmed.length() > 30) {
                for (String pattern : claimPatterns) {
                    if (trimmed.toLowerCase().contains(pattern)) {
                        claims.add(trimmed);
                        break;
                    }
                }
            }
        }

        return claims;
    }

    /**
     * Simulate fact-checking a claim against known facts
     * In production, this would call real APIs
     */
    public FactCheckResult checkClaim(String claim) {
        FactCheckResult result = new FactCheckResult();
        
        // Check for known trustworthy patterns
        String lowerClaim = claim.toLowerCase();
        
        // Look for scientific language
        if (lowerClaim.contains("study") || lowerClaim.contains("research") ||
            lowerClaim.contains("scientists") || lowerClaim.contains("experts")) {
            result.setTrustScore(0.8);
            result.setSource("Scientific consensus");
            result.setStatus("LIKELY_TRUE");
        }
        // Look for official sources
        else if (lowerClaim.contains("government") || lowerClaim.contains("official") ||
                 lowerClaim.contains("authority") || lowerClaim.contains("department")) {
            result.setTrustScore(0.7);
            result.setSource("Official source");
            result.setStatus("LIKELY_TRUE");
        }
        // Look for unsubstantiated claims
        else if (lowerClaim.contains("alleged") || lowerClaim.contains("rumor") ||
                 lowerClaim.contains("speculated") || lowerClaim.contains("unnamed")) {
            result.setTrustScore(0.3);
            result.setSource("Unconfirmed source");
            result.setStatus("UNVERIFIED");
        }
        // Default
        else {
            result.setTrustScore(0.5);
            result.setSource("Unknown source");
            result.setStatus("NEEDS_VERIFICATION");
        }

        // Check if any fact-checking organization has verified this
        for (String org : FACT_CHECK_ORGANIZATIONS) {
            if (lowerClaim.contains(org.toLowerCase()) || 
                lowerClaim.contains(org.replace(" ", "").toLowerCase())) {
                result.setTrustScore(0.9);
                result.setSource("Verified by " + org);
                result.setStatus("VERIFIED_TRUE");
                break;
            }
        }

        return result;
    }

    /**
     * Simulate cross-referencing with trusted sources
     */
    public CrossReferenceResult crossReference(String content) {
        CrossReferenceResult result = new CrossReferenceResult();
        String lowerContent = content.toLowerCase();
        
        // Check for mentions of trusted sources
        List<String> foundSources = new ArrayList<>();
        for (String source : FACT_CHECK_ORGANIZATIONS) {
            if (lowerContent.contains(source.toLowerCase())) {
                foundSources.add(source);
            }
        }

        result.setSourcesFound(foundSources);
        result.setTrustedMentions(foundSources.size());
        result.setScore(foundSources.size() > 0 ? 0.8 : 0.3);
        result.setRecommendation(foundSources.size() > 0 ? 
            "This article references fact-checking sources." : 
            "This article does not reference any fact-checking sources. Consider verifying with Snopes or FactCheck.org.");

        return result;
    }

    // ─── Inner Classes ────────────────────────────────────────────────────────

    public static class FactCheckResult {
        private double trustScore;
        private String source;
        private String status;

        public double getTrustScore() { return trustScore; }
        public void setTrustScore(double trustScore) { this.trustScore = trustScore; }
        public String getSource() { return source; }
        public void setSource(String source) { this.source = source; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }

        public String getStatusLabel() {
            switch (status) {
                case "VERIFIED_TRUE": return "✅ Verified True";
                case "LIKELY_TRUE": return "🟢 Likely True";
                case "NEEDS_VERIFICATION": return "🟡 Needs Verification";
                case "UNVERIFIED": return "🔴 Unverified";
                default: return "⚪ Unknown";
            }
        }
    }

    public static class CrossReferenceResult {
        private List<String> sourcesFound = new ArrayList<>();
        private int trustedMentions;
        private double score;
        private String recommendation;

        public List<String> getSourcesFound() { return sourcesFound; }
        public void setSourcesFound(List<String> sourcesFound) { this.sourcesFound = sourcesFound; }
        public int getTrustedMentions() { return trustedMentions; }
        public void setTrustedMentions(int trustedMentions) { this.trustedMentions = trustedMentions; }
        public double getScore() { return score; }
        public void setScore(double score) { this.score = score; }
        public String getRecommendation() { return recommendation; }
        public void setRecommendation(String recommendation) { this.recommendation = recommendation; }
    }
}