package com.NewsCred.backend.controller;

import com.NewsCred.backend.dto.ErrorResponse;
import com.NewsCred.backend.dto.ImageAnalysisResponse;
import com.NewsCred.backend.entity.User;
import com.NewsCred.backend.repository.UserRepository;
import com.NewsCred.backend.service.ImageForensicsService;
import com.NewsCred.backend.service.ImageForensicsService.ImageForensicsResult;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

/**
 * SECURITY MODEL: same as ArticleController - the acting user is always the
 * authenticated JWT principal, and this counts against the same free-tier
 * analysis limit (an image scan is an "analysis" like a URL/text one).
 */
@RestController
@RequestMapping("/api/images")
public class ImageController {

    private static final long MAX_IMAGE_BYTES = 8L * 1024 * 1024; // 8 MB

    private final ImageForensicsService imageForensicsService;
    private final UserRepository userRepository;

    public ImageController(ImageForensicsService imageForensicsService, UserRepository userRepository) {
        this.imageForensicsService = imageForensicsService;
        this.userRepository = userRepository;
    }

    @PostMapping("/analyze")
    public ResponseEntity<?> analyzeImage(@AuthenticationPrincipal User currentUser,
                                          @RequestParam("image") MultipartFile image) {
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

        if (image == null || image.isEmpty()) {
            return ResponseEntity.badRequest()
                .body(ErrorResponse.of("VALIDATION_ERROR", "Please attach an image to analyze"));
        }
        String contentType = image.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            return ResponseEntity.badRequest()
                .body(ErrorResponse.of("VALIDATION_ERROR", "Uploaded file must be an image"));
        }
        if (image.getSize() > MAX_IMAGE_BYTES) {
            return ResponseEntity.badRequest()
                .body(ErrorResponse.of("VALIDATION_ERROR", "Image must be smaller than 8 MB"));
        }

        try {
            ImageForensicsResult forensicsResult =
                imageForensicsService.analyze(image.getBytes(), image.getOriginalFilename());
            ImageAnalysisResponse response = ImageAnalysisResponse.from(forensicsResult);

            currentUser.setAnalysisCount(currentUser.getAnalysisCount() + 1);
            userRepository.save(currentUser);

            return ResponseEntity.ok(response);
        } catch (IOException e) {
            return ResponseEntity.badRequest()
                .body(ErrorResponse.of("VALIDATION_ERROR", "Could not read the uploaded image"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ErrorResponse.of("SERVER_ERROR", "Image analysis failed: " + e.getMessage()));
        }
    }
}
