package com.NewsCred.backend.dto;

import com.NewsCred.backend.service.ImageForensicsService.ImageForensicsResult;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ImageAnalysisResponseTest {

    private ImageForensicsResult result(boolean attempted, boolean available, Double probability) {
        ImageForensicsResult r = new ImageForensicsResult();
        r.setAttempted(attempted);
        r.setAvailable(available);
        r.setAiGeneratedProbability(probability);
        return r;
    }

    @Test
    void notConfiguredProducesNeedsReviewWithExplanation() {
        ImageAnalysisResponse response = ImageAnalysisResponse.from(result(false, false, null));

        assertFalse(response.isAttempted());
        assertEquals("NEEDS_REVIEW", response.getStatus());
        assertTrue(response.getMessage().toLowerCase().contains("not configured"));
        assertNull(response.getAiGeneratedProbability());
    }

    @Test
    void configuredButUnreachableProducesNeedsReviewWithDifferentExplanation() {
        ImageAnalysisResponse response = ImageAnalysisResponse.from(result(true, false, null));

        assertTrue(response.isAttempted());
        assertFalse(response.isAvailable());
        assertEquals("NEEDS_REVIEW", response.getStatus());
        assertTrue(response.getMessage().toLowerCase().contains("unavailable"));
    }

    @Test
    void highProbabilityIsFlaggedAiGenerated() {
        ImageAnalysisResponse response = ImageAnalysisResponse.from(result(true, true, 0.9));

        assertEquals("AI_GENERATED", response.getStatus());
        assertEquals(0.9, response.getAiGeneratedProbability());
    }

    @Test
    void lowProbabilityIsVerified() {
        ImageAnalysisResponse response = ImageAnalysisResponse.from(result(true, true, 0.05));

        assertEquals("VERIFIED", response.getStatus());
    }

    @Test
    void midRangeProbabilityIsInconclusive() {
        ImageAnalysisResponse response = ImageAnalysisResponse.from(result(true, true, 0.5));

        assertEquals("NEEDS_REVIEW", response.getStatus());
        assertTrue(response.getVerdictMessage().toLowerCase().contains("inconclusive"));
    }

    @Test
    void boundaryAtSeventyPercentIsAiGenerated() {
        assertEquals("AI_GENERATED", ImageAnalysisResponse.from(result(true, true, 0.70)).getStatus());
        assertEquals("NEEDS_REVIEW", ImageAnalysisResponse.from(result(true, true, 0.69)).getStatus());
    }

    @Test
    void boundaryAtFifteenPercentIsVerified() {
        assertEquals("VERIFIED", ImageAnalysisResponse.from(result(true, true, 0.15)).getStatus());
        assertEquals("NEEDS_REVIEW", ImageAnalysisResponse.from(result(true, true, 0.16)).getStatus());
    }
}
