package com.NewsCred.backend.controller;

import com.NewsCred.backend.dto.ArticleAnalysisResponse;
import com.NewsCred.backend.dto.ErrorResponse;
import com.NewsCred.backend.entity.Article;
import com.NewsCred.backend.entity.User;
import com.NewsCred.backend.repository.UserRepository;
import com.NewsCred.backend.service.AnalysisService;
import com.NewsCred.backend.service.AudioTranscriptionService;
import com.NewsCred.backend.service.AudioTranscriptionService.TranscriptionResult;
import com.NewsCred.backend.service.ContentExtractorService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

/**
 * Audio credibility check: transcribe the upload, then run the transcript
 * through the SAME article-analysis pipeline as URL/text submissions
 * (ArticleController) - no parallel scoring system for audio.
 *
 * SECURITY MODEL: same as ArticleController - authenticated JWT principal
 * only, and this counts against the same free-tier analysis limit.
 */
@RestController
@RequestMapping("/api/audio")
public class AudioController {

    private static final long MAX_AUDIO_BYTES = 20L * 1024 * 1024; // 20 MB, comfortably under Groq's own limit
    private static final int MIN_TRANSCRIPT_LENGTH = 50;

    private final AudioTranscriptionService audioTranscriptionService;
    private final AnalysisService analysisService;
    private final ContentExtractorService contentExtractor;
    private final UserRepository userRepository;

    public AudioController(AudioTranscriptionService audioTranscriptionService,
                           AnalysisService analysisService,
                           ContentExtractorService contentExtractor,
                           UserRepository userRepository) {
        this.audioTranscriptionService = audioTranscriptionService;
        this.analysisService = analysisService;
        this.contentExtractor = contentExtractor;
        this.userRepository = userRepository;
    }

    @PostMapping("/analyze")
    public ResponseEntity<?> analyzeAudio(@AuthenticationPrincipal User currentUser,
                                          @RequestParam("audio") MultipartFile audio) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ErrorResponse.of("AUTH_ERROR", "Authentication required"));
        }

        if (!currentUser.isPremium() && currentUser.getAnalysisCount() >= ArticleController.FREE_ANALYSIS_LIMIT) {
            return ResponseEntity.status(HttpStatus.PAYMENT_REQUIRED)
                .body(ErrorResponse.of("UPGRADE_REQUIRED",
                    "You have used all " + ArticleController.FREE_ANALYSIS_LIMIT +
                    " free analyses. Upgrade to Premium for unlimited analyses."));
        }

        if (audio == null || audio.isEmpty()) {
            return ResponseEntity.badRequest()
                .body(ErrorResponse.of("VALIDATION_ERROR", "Please attach an audio file to analyze"));
        }
        String contentType = audio.getContentType();
        if (contentType == null || !contentType.startsWith("audio/")) {
            return ResponseEntity.badRequest()
                .body(ErrorResponse.of("VALIDATION_ERROR", "Uploaded file must be an audio file"));
        }
        if (audio.getSize() > MAX_AUDIO_BYTES) {
            return ResponseEntity.badRequest()
                .body(ErrorResponse.of("VALIDATION_ERROR", "Audio must be smaller than 20 MB"));
        }

        try {
            TranscriptionResult transcription =
                audioTranscriptionService.transcribe(audio.getBytes(), audio.getOriginalFilename());

            if (!transcription.isAttempted()) {
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(ErrorResponse.of("TRANSCRIPTION_UNAVAILABLE",
                        "Audio transcription is not configured on this server. Set GROQ_API_KEY."));
            }
            if (!transcription.isAvailable() || transcription.getTranscript() == null) {
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(ErrorResponse.of("TRANSCRIPTION_FAILED",
                        "Could not transcribe this audio right now. Try again shortly."));
            }

            String transcript = transcription.getTranscript().trim();
            if (transcript.length() < MIN_TRANSCRIPT_LENGTH) {
                return ResponseEntity.badRequest()
                    .body(ErrorResponse.of("VALIDATION_ERROR",
                        "The transcribed audio was too short to analyze (minimum " +
                        MIN_TRANSCRIPT_LENGTH + " characters of speech required)."));
            }

            String sanitized = contentExtractor.sanitizeContent(transcript);

            Article article = new Article();
            article.setUserId(currentUser.getId());
            article.setContent(sanitized);
            article.setTitle(contentExtractor.extractTitle(sanitized));
            article.setSourceName("Audio upload (transcribed)");
            article.setImageCount(0);
            article.setImageUrls(List.of());

            Article analyzed = analysisService.analyzeArticle(article);
            ArticleAnalysisResponse response = ArticleAnalysisResponse.fromArticle(analyzed);

            currentUser.setAnalysisCount(currentUser.getAnalysisCount() + 1);
            userRepository.save(currentUser);

            if (!currentUser.isPremium()) {
                response = ArticleController.applyFreeTierRedaction(response);
            }
            return ResponseEntity.ok(response);

        } catch (IOException e) {
            return ResponseEntity.badRequest()
                .body(ErrorResponse.of("VALIDATION_ERROR", "Could not read the uploaded audio file"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ErrorResponse.of("SERVER_ERROR", "Audio analysis failed: " + e.getMessage()));
        }
    }
}
