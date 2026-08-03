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
 * Speech-to-text via Groq's hosted Whisper API
 * (https://console.groq.com/docs/speech-to-text) - free tier, no credit
 * card required, and deliberately OpenAI-Whisper-API-compatible (same
 * multipart request shape, same {"text": "..."} response shape), which is
 * why this reads almost identically to a straight OpenAI integration.
 * The transcript is handed off to AnalysisService unchanged - audio
 * credibility checking reuses the whole article-analysis pipeline instead
 * of a parallel system.
 *
 * DESIGN NOTES (mirrors GoogleFactCheckService/ImageForensicsService):
 * - Requires GROQ_API_KEY. Degrades gracefully (attempted = false) when
 *   not configured.
 * - Wrapped in a timeout + try/catch: transcription can take a while for
 *   longer clips, but a slow/unreachable API never crashes the request.
 */
@Service
public class AudioTranscriptionService {

    private static final String GROQ_TRANSCRIPTION_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
    private static final Duration TIMEOUT = Duration.ofSeconds(60);

    private final WebClient webClient;

    @Value("${groq.api-key:}")
    private String apiKey;

    public AudioTranscriptionService() {
        this.webClient = WebClient.builder().build();
    }

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isEmpty();
    }

    /**
     * Transcribe raw audio bytes to text. Never throws: on any failure
     * returns a result with available=false.
     */
    public TranscriptionResult transcribe(byte[] audioBytes, String filename) {
        TranscriptionResult result = new TranscriptionResult();

        if (!isConfigured()) {
            result.setAttempted(false);
            result.setAvailable(false);
            return result;
        }
        result.setAttempted(true);

        try {
            MultipartBodyBuilder builder = new MultipartBodyBuilder();
            String safeName = (filename == null || filename.isBlank()) ? "upload.mp3" : filename;
            builder.part("file", new ByteArrayResource(audioBytes) {
                @Override
                public String getFilename() {
                    return safeName;
                }
            });
            builder.part("model", "whisper-large-v3");

            JsonNode response = webClient.post()
                .uri(GROQ_TRANSCRIPTION_URL)
                .header("Authorization", "Bearer " + apiKey)
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(BodyInserters.fromMultipartData(builder.build()))
                .retrieve()
                .bodyToMono(JsonNode.class)
                .timeout(TIMEOUT)
                .block();

            if (response == null || !response.has("text")) {
                result.setAvailable(false);
                return result;
            }

            result.setAvailable(true);
            result.setTranscript(response.path("text").asText(null));

        } catch (Exception e) {
            // Timeout / network / quota / malformed response - degrade gracefully
            result.setAvailable(false);
        }

        return result;
    }

    public static class TranscriptionResult {
        private boolean attempted;
        private boolean available;
        private String transcript;

        public boolean isAttempted() { return attempted; }
        public void setAttempted(boolean attempted) { this.attempted = attempted; }
        public boolean isAvailable() { return available; }
        public void setAvailable(boolean available) { this.available = available; }
        public String getTranscript() { return transcript; }
        public void setTranscript(String transcript) { this.transcript = transcript; }
    }
}
