package com.NewsCred.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.Map;

/**
 * Translate non-English content to English via the Google Cloud Translation
 * API v2 (Basic) - https://cloud.google.com/translate/docs/reference/rest/v2/translate
 *
 * The linguistic credibility heuristics in AnalysisService are English-
 * keyword based ("according to", "shocking", clickbait phrases, etc.), so
 * non-English articles need translating before those heuristics mean
 * anything. A single call both detects the source language AND translates,
 * which is why AnalysisService uses this as its language-detection signal
 * too (no separate detect call needed).
 *
 * DESIGN NOTES (mirrors GoogleFactCheckService/ImageForensicsService):
 * - Requires GOOGLE_TRANSLATE_API_KEY. Degrades gracefully (attempted =
 *   false) when not configured - articles are then scored as-is.
 */
@Service
public class TranslationService {

    private static final String TRANSLATE_URL = "https://translation.googleapis.com/language/translate2";
    private static final Duration TIMEOUT = Duration.ofSeconds(10);
    private static final int MAX_CHARS = 5000; // Translation API request-size guardrail

    private final WebClient webClient;

    @Value("${google.translate.api-key:}")
    private String apiKey;

    public TranslationService() {
        this.webClient = WebClient.builder().build();
    }

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isEmpty();
    }

    /**
     * Translate text to English, auto-detecting the source language.
     * Never throws: on any failure returns a result with available=false.
     */
    public TranslationResult translateToEnglish(String text) {
        TranslationResult result = new TranslationResult();

        if (!isConfigured() || text == null || text.isBlank()) {
            result.setAttempted(false);
            result.setAvailable(false);
            return result;
        }
        result.setAttempted(true);

        try {
            String truncated = text.length() > MAX_CHARS ? text.substring(0, MAX_CHARS) : text;

            JsonNode response = webClient.post()
                .uri(TRANSLATE_URL + "?key=" + apiKey)
                .bodyValue(Map.of("q", truncated, "target", "en", "format", "text"))
                .retrieve()
                .bodyToMono(JsonNode.class)
                .timeout(TIMEOUT)
                .block();

            if (response == null) {
                result.setAvailable(false);
                return result;
            }

            JsonNode translation = response.path("data").path("translations").path(0);
            if (translation.isMissingNode()) {
                result.setAvailable(false);
                return result;
            }

            result.setAvailable(true);
            result.setDetectedLanguage(translation.path("detectedSourceLanguage").asText(null));
            result.setTranslatedText(translation.path("translatedText").asText(null));

        } catch (Exception e) {
            // Timeout / network / quota / malformed response - degrade gracefully
            result.setAvailable(false);
        }

        return result;
    }

    public static class TranslationResult {
        private boolean attempted;
        private boolean available;
        private String detectedLanguage; // e.g. "fr", "en"
        private String translatedText;

        public boolean isAttempted() { return attempted; }
        public void setAttempted(boolean attempted) { this.attempted = attempted; }
        public boolean isAvailable() { return available; }
        public void setAvailable(boolean available) { this.available = available; }
        public String getDetectedLanguage() { return detectedLanguage; }
        public void setDetectedLanguage(String detectedLanguage) { this.detectedLanguage = detectedLanguage; }
        public String getTranslatedText() { return translatedText; }
        public void setTranslatedText(String translatedText) { this.translatedText = translatedText; }
    }
}
