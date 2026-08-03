package com.NewsCred.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;

/**
 * Real AI-generated-image detection via Sightengine's "genai" model
 * (https://sightengine.com/docs/detect-ai-generated-images), as opposed to
 * ImageVerificationService's URL-string heuristics (which only recognize
 * AI-tool keywords in a filename/URL and never look at pixel content).
 *
 * DESIGN NOTES (mirrors GoogleFactCheckService/PaystackService):
 * - Requires SIGHTENGINE_API_USER + SIGHTENGINE_API_SECRET env vars, from a
 *   free account at https://sightengine.com. Degrades gracefully (attempted
 *   = false) when not configured, so the feature is optional in dev.
 * - Every call is wrapped in a timeout + try/catch: a slow/unreachable API
 *   never fails the whole request, it just reports "unavailable".
 */
@Service
public class ImageForensicsService {

    private static final String SIGHTENGINE_URL = "https://api.sightengine.com/1.0/check.json";
    private static final Duration TIMEOUT = Duration.ofSeconds(15);

    private final WebClient webClient;

    @Value("${sightengine.api-user:}")
    private String apiUser;

    @Value("${sightengine.api-secret:}")
    private String apiSecret;

    public ImageForensicsService() {
        this.webClient = WebClient.builder().build();
    }

    public boolean isConfigured() {
        return apiUser != null && !apiUser.isEmpty() && apiSecret != null && !apiSecret.isEmpty();
    }

    /**
     * Analyze raw image bytes for AI-generation signals.
     * Never throws: on any failure returns a result with available=false.
     */
    public ImageForensicsResult analyze(byte[] imageBytes, String filename) {
        ImageForensicsResult result = new ImageForensicsResult();

        if (!isConfigured()) {
            result.setAttempted(false);
            result.setAvailable(false);
            return result;
        }
        result.setAttempted(true);

        try {
            MultipartBodyBuilder builder = new MultipartBodyBuilder();
            String safeName = (filename == null || filename.isBlank()) ? "upload.jpg" : filename;
            builder.part("media", new ByteArrayResource(imageBytes) {
                @Override
                public String getFilename() {
                    return safeName;
                }
            });
            builder.part("models", "genai");
            builder.part("api_user", apiUser);
            builder.part("api_secret", apiSecret);

            JsonNode response = webClient.post()
                .uri(SIGHTENGINE_URL)
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(BodyInserters.fromMultipartData(builder.build()))
                .retrieve()
                .bodyToMono(JsonNode.class)
                .timeout(TIMEOUT)
                .block();

            if (response == null || !"success".equals(response.path("status").asText())) {
                result.setAvailable(false);
                return result;
            }

            result.setAvailable(true);
            double aiProbability = response.path("type").path("ai_generated").asDouble(-1);
            if (aiProbability >= 0) {
                result.setAiGeneratedProbability(aiProbability);
            }

        } catch (Exception e) {
            // Timeout / network / quota / malformed response - degrade gracefully
            result.setAvailable(false);
        }

        return result;
    }

    public static class ImageForensicsResult {
        private boolean attempted;
        private boolean available;
        private Double aiGeneratedProbability; // 0.0 (authentic) .. 1.0 (AI-generated), null if unavailable

        public boolean isAttempted() { return attempted; }
        public void setAttempted(boolean attempted) { this.attempted = attempted; }
        public boolean isAvailable() { return available; }
        public void setAvailable(boolean available) { this.available = available; }
        public Double getAiGeneratedProbability() { return aiGeneratedProbability; }
        public void setAiGeneratedProbability(Double aiGeneratedProbability) { this.aiGeneratedProbability = aiGeneratedProbability; }
    }
}
