package com.NewsCred.backend.dto;

import com.NewsCred.backend.service.ImageForensicsService.ImageForensicsResult;

public class ImageAnalysisResponse {

    private boolean error;
    private String message;

    /** Whether the forensics API was configured/attempted at all. */
    private boolean attempted;
    /** Whether the forensics API actually responded (vs. timeout/unreachable). */
    private boolean available;

    /** 0.0 (authentic) .. 1.0 (AI-generated), null if unavailable. */
    private Double aiGeneratedProbability;

    /** Matches mobile's ImageStatus union: VERIFIED | AI_GENERATED | NEEDS_REVIEW. */
    private String status;
    private String verdictMessage;

    public static ImageAnalysisResponse from(ImageForensicsResult result) {
        ImageAnalysisResponse r = new ImageAnalysisResponse();
        r.setAttempted(result.isAttempted());
        r.setAvailable(result.isAvailable());

        if (!result.isAttempted()) {
            r.setStatus("NEEDS_REVIEW");
            r.setMessage("AI-image detection is not configured on this server.");
            r.setVerdictMessage(r.getMessage());
            return r;
        }
        if (!result.isAvailable() || result.getAiGeneratedProbability() == null) {
            r.setStatus("NEEDS_REVIEW");
            r.setMessage("Live AI-image detection is unavailable right now (no connection). Try again shortly.");
            r.setVerdictMessage(r.getMessage());
            return r;
        }

        double p = result.getAiGeneratedProbability();
        r.setAiGeneratedProbability(p);

        if (p >= 0.70) {
            r.setStatus("AI_GENERATED");
            r.setVerdictMessage(String.format(
                "This image is likely AI-generated (%.0f%% confidence). Treat it as illustrative, not photographic evidence.",
                p * 100));
        } else if (p <= 0.15) {
            r.setStatus("VERIFIED");
            r.setVerdictMessage(String.format(
                "No strong AI-generation signals detected (%.0f%% AI-generated confidence).", p * 100));
        } else {
            r.setStatus("NEEDS_REVIEW");
            r.setVerdictMessage(String.format(
                "Inconclusive: %.0f%% AI-generated confidence. Verify with the original source before trusting this image.",
                p * 100));
        }
        r.setMessage(r.getVerdictMessage());
        return r;
    }

    public boolean isError() { return error; }
    public void setError(boolean error) { this.error = error; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public boolean isAttempted() { return attempted; }
    public void setAttempted(boolean attempted) { this.attempted = attempted; }
    public boolean isAvailable() { return available; }
    public void setAvailable(boolean available) { this.available = available; }
    public Double getAiGeneratedProbability() { return aiGeneratedProbability; }
    public void setAiGeneratedProbability(Double aiGeneratedProbability) { this.aiGeneratedProbability = aiGeneratedProbability; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getVerdictMessage() { return verdictMessage; }
    public void setVerdictMessage(String verdictMessage) { this.verdictMessage = verdictMessage; }
}
