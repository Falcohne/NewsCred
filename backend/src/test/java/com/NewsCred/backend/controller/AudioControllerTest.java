package com.NewsCred.backend.controller;

import com.NewsCred.backend.dto.ArticleAnalysisResponse;
import com.NewsCred.backend.entity.Article;
import com.NewsCred.backend.entity.User;
import com.NewsCred.backend.repository.UserRepository;
import com.NewsCred.backend.service.AnalysisService;
import com.NewsCred.backend.service.AudioTranscriptionService;
import com.NewsCred.backend.service.AudioTranscriptionService.TranscriptionResult;
import com.NewsCred.backend.service.ContentExtractorService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AudioControllerTest {

    @Mock private AudioTranscriptionService audioTranscriptionService;
    @Mock private AnalysisService analysisService;
    @Mock private ContentExtractorService contentExtractor;
    @Mock private UserRepository userRepository;

    private AudioController controller;

    private final String LONG_TRANSCRIPT = "According to officials, the new policy was announced today "
        + "and will take effect next month across all regional offices nationwide.";

    private void setUp() {
        controller = new AudioController(audioTranscriptionService, analysisService, contentExtractor, userRepository);
    }

    private User buildUser(boolean premium, int analysisCount) {
        User user = new User();
        user.setId("user-1");
        user.setPremium(premium);
        user.setAnalysisCount(analysisCount);
        return user;
    }

    private TranscriptionResult transcriptionResult(boolean attempted, boolean available, String transcript) {
        TranscriptionResult r = new TranscriptionResult();
        r.setAttempted(attempted);
        r.setAvailable(available);
        r.setTranscript(transcript);
        return r;
    }

    private Article analyzedArticle() {
        Article article = new Article();
        article.setOverallScore(72.0);
        article.setCredibilityVerdict("LIKELY_CREDIBLE");
        article.setContentSummary("A short summary.");
        article.setAnalysisSummary("Full analysis summary text.");
        return article;
    }

    @Test
    void rejectsUnauthenticatedUser() {
        setUp();
        MockMultipartFile file = new MockMultipartFile("audio", "clip.mp3", "audio/mpeg", new byte[]{1, 2, 3});

        ResponseEntity<?> response = controller.analyzeAudio(null, file);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        verifyNoInteractions(audioTranscriptionService);
    }

    @Test
    void rejectsWhenFreeTierLimitReached() {
        setUp();
        MockMultipartFile file = new MockMultipartFile("audio", "clip.mp3", "audio/mpeg", new byte[]{1, 2, 3});

        ResponseEntity<?> response = controller.analyzeAudio(buildUser(false, ArticleController.FREE_ANALYSIS_LIMIT), file);

        assertEquals(HttpStatus.PAYMENT_REQUIRED, response.getStatusCode());
        verifyNoInteractions(audioTranscriptionService);
    }

    @Test
    void rejectsEmptyFile() {
        setUp();
        MockMultipartFile file = new MockMultipartFile("audio", "clip.mp3", "audio/mpeg", new byte[0]);

        ResponseEntity<?> response = controller.analyzeAudio(buildUser(false, 0), file);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        verifyNoInteractions(audioTranscriptionService);
    }

    @Test
    void rejectsNonAudioContentType() {
        setUp();
        MockMultipartFile file = new MockMultipartFile("audio", "doc.pdf", "application/pdf", new byte[]{1, 2, 3});

        ResponseEntity<?> response = controller.analyzeAudio(buildUser(false, 0), file);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        verifyNoInteractions(audioTranscriptionService);
    }

    @Test
    void rejectsOversizedFile() {
        setUp();
        byte[] tooBig = new byte[21 * 1024 * 1024]; // 21MB > 20MB limit
        MockMultipartFile file = new MockMultipartFile("audio", "big.mp3", "audio/mpeg", tooBig);

        ResponseEntity<?> response = controller.analyzeAudio(buildUser(false, 0), file);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        verifyNoInteractions(audioTranscriptionService);
    }

    @Test
    void returnsServiceUnavailableWhenTranscriptionNotConfigured() {
        setUp();
        MockMultipartFile file = new MockMultipartFile("audio", "clip.mp3", "audio/mpeg", new byte[]{1, 2, 3});
        when(audioTranscriptionService.transcribe(any(), any())).thenReturn(transcriptionResult(false, false, null));

        ResponseEntity<?> response = controller.analyzeAudio(buildUser(false, 0), file);

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
        verifyNoInteractions(analysisService);
    }

    @Test
    void returnsServiceUnavailableWhenTranscriptionAttemptedButFailed() {
        setUp();
        MockMultipartFile file = new MockMultipartFile("audio", "clip.mp3", "audio/mpeg", new byte[]{1, 2, 3});
        when(audioTranscriptionService.transcribe(any(), any())).thenReturn(transcriptionResult(true, false, null));

        ResponseEntity<?> response = controller.analyzeAudio(buildUser(false, 0), file);

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
        verifyNoInteractions(analysisService);
    }

    @Test
    void rejectsTranscriptThatIsTooShort() {
        setUp();
        MockMultipartFile file = new MockMultipartFile("audio", "clip.mp3", "audio/mpeg", new byte[]{1, 2, 3});
        when(audioTranscriptionService.transcribe(any(), any())).thenReturn(transcriptionResult(true, true, "Too short."));

        ResponseEntity<?> response = controller.analyzeAudio(buildUser(false, 0), file);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        verifyNoInteractions(analysisService);
    }

    @Test
    void successfulAnalysisForPremiumUserSkipsRedaction() throws Exception {
        setUp();
        MockMultipartFile file = new MockMultipartFile("audio", "clip.mp3", "audio/mpeg", new byte[]{1, 2, 3});
        when(audioTranscriptionService.transcribe(any(), any())).thenReturn(transcriptionResult(true, true, LONG_TRANSCRIPT));
        when(contentExtractor.sanitizeContent(any())).thenReturn(LONG_TRANSCRIPT);
        when(contentExtractor.extractTitle(any())).thenReturn("Transcribed Audio");
        when(analysisService.analyzeArticle(any(Article.class))).thenReturn(analyzedArticle());
        User user = buildUser(true, 5);

        ResponseEntity<?> response = controller.analyzeAudio(user, file);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        ArticleAnalysisResponse body = (ArticleAnalysisResponse) response.getBody();
        assertNotNull(body);
        assertEquals("LIKELY_CREDIBLE", body.getCredibilityVerdict());
        assertEquals(6, user.getAnalysisCount());
        verify(userRepository).save(user);
    }

    @Test
    void successfulAnalysisForFreeTierUserAppliesRedaction() throws Exception {
        setUp();
        MockMultipartFile file = new MockMultipartFile("audio", "clip.mp3", "audio/mpeg", new byte[]{1, 2, 3});
        when(audioTranscriptionService.transcribe(any(), any())).thenReturn(transcriptionResult(true, true, LONG_TRANSCRIPT));
        when(contentExtractor.sanitizeContent(any())).thenReturn(LONG_TRANSCRIPT);
        when(contentExtractor.extractTitle(any())).thenReturn("Transcribed Audio");
        when(analysisService.analyzeArticle(any(Article.class))).thenReturn(analyzedArticle());
        User user = buildUser(false, 0);

        ResponseEntity<?> response = controller.analyzeAudio(user, file);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        ArticleAnalysisResponse body = (ArticleAnalysisResponse) response.getBody();
        assertNotNull(body);
        assertNull(body.getDateStatus());
        assertNull(body.getFactCheckDetails());
        assertTrue(body.getAnalysisSummary().contains("Upgrade to Premium"));
    }
}
