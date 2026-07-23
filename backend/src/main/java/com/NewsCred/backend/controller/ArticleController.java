package com.NewsCred.backend.controller;

import com.NewsCred.backend.dto.ArticleAnalysisRequest;
import com.NewsCred.backend.dto.ArticleAnalysisResponse;
import com.NewsCred.backend.dto.ErrorResponse;
import com.NewsCred.backend.entity.Article;
import com.NewsCred.backend.entity.User;
import com.NewsCred.backend.repository.ArticleRepository;
import com.NewsCred.backend.repository.UserRepository;
import com.NewsCred.backend.service.AnalysisService;
import com.NewsCred.backend.service.ContentExtractorService;
import com.NewsCred.backend.service.FetchResult;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * SECURITY MODEL:
 * - The acting user is ALWAYS the authenticated principal from the JWT.
 *   Any userId sent by the client is ignored.
 * - Free-tier limits (3 lifetime analyses) are enforced HERE, on the server.
 * - Users can only read/delete their own articles (ownership checks).
 */
@RestController
@RequestMapping("/api/articles")
public class ArticleController {

    public static final int FREE_ANALYSIS_LIMIT = 3;

    private final AnalysisService analysisService;
    private final ArticleRepository articleRepository;
    private final UserRepository userRepository;
    private final ContentExtractorService contentExtractor;

    public ArticleController(AnalysisService analysisService,
                            ArticleRepository articleRepository,
                            UserRepository userRepository,
                            ContentExtractorService contentExtractor) {
        this.analysisService = analysisService;
        this.articleRepository = articleRepository;
        this.userRepository = userRepository;
        this.contentExtractor = contentExtractor;
    }

    @GetMapping("/test")
    public ResponseEntity<Map<String, String>> test() {
        Map<String, String> response = new HashMap<>();
        response.put("message", "Article controller is working");
        response.put("status", "ok");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/analyze")
    public ResponseEntity<?> analyzeArticle(@AuthenticationPrincipal User currentUser,
                                            @Valid @RequestBody ArticleAnalysisRequest request) {
        try {
            if (currentUser == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ErrorResponse.of("AUTH_ERROR", "Authentication required"));
            }

            // Server-side free-tier enforcement (client checks are UX only)
            if (!currentUser.isPremium() && currentUser.getAnalysisCount() >= FREE_ANALYSIS_LIMIT) {
                return ResponseEntity.status(HttpStatus.PAYMENT_REQUIRED)
                    .body(ErrorResponse.of("UPGRADE_REQUIRED",
                        "You have used all " + FREE_ANALYSIS_LIMIT +
                        " free analyses. Upgrade to Premium for unlimited analyses."));
            }

            boolean hasUrl = request.getUrl() != null && !request.getUrl().trim().isEmpty();
            boolean hasContent = request.getContent() != null && !request.getContent().trim().isEmpty();

            if (!hasUrl && !hasContent) {
                return ResponseEntity.badRequest()
                    .body(ErrorResponse.of("VALIDATION_ERROR", "Please provide either a URL or article content"));
            }

            Article article = new Article();
            article.setUserId(currentUser.getId());

            ResponseEntity<?> result = hasUrl
                ? analyzeByUrl(request.getUrl().trim(), article)
                : analyzeByContent(request.getContent().trim(), article);

            // Count usage only on successful analysis
            if (result.getStatusCode().is2xxSuccessful()) {
                currentUser.setAnalysisCount(currentUser.getAnalysisCount() + 1);
                userRepository.save(currentUser);

                // PREMIUM GATING: free tier gets the verdict + score;
                // the deep forensic breakdown is a premium feature.
                if (!currentUser.isPremium()
                        && result.getBody() instanceof ArticleAnalysisResponse) {
                    ArticleAnalysisResponse resp = (ArticleAnalysisResponse) result.getBody();
                    resp.setDateStatus(null);
                    resp.setDateScore(null);
                    resp.setDateMessage("Upgrade to Premium to see date verification details.");
                    resp.setAuthorCredibilityScore(null);
                    resp.setAuthorStatus(null);
                    resp.setAuthorMessage("Upgrade to Premium to see author credibility details.");
                    resp.setFactCheckDetails(null);  // claim-by-claim breakdown is premium
                    resp.setAnalysisSummary(
                        "This article was rated " +
                        resp.getCredibilityVerdict().toLowerCase().replace("_", " ") +
                        " with a score of " + String.format("%.1f", resp.getOverallScore()) + "%.\n\n" +
                        "SUMMARY\n" + resp.getContentSummary() + "\n\n" +
                        "Upgrade to Premium for the full report: claim-by-claim fact-checks, " +
                        "date verification, author credibility, and image analysis.");
                    return ResponseEntity.ok(resp);
                }
            }
            return result;

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                .body(ErrorResponse.of("VALIDATION_ERROR", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ErrorResponse.of("SERVER_ERROR", "Analysis failed: " + e.getMessage()));
        }
    }

    private ResponseEntity<?> analyzeByUrl(String url, Article article) {
        try {
            FetchResult fetchResult = contentExtractor.fetchContent(url);

            if (!fetchResult.isSuccess()) {
                return ResponseEntity.badRequest()
                    .body(ErrorResponse.of("FETCH_ERROR", fetchResult.getErrorMessage()));
            }

            article.setUrl(url);
            article.setContent(fetchResult.getContent());
            article.setTitle(fetchResult.getTitle());
            article.setSourceName(fetchResult.getSourceName());
            article.setImageUrls(fetchResult.getImageUrls());
            article.setImageCount(fetchResult.getImageUrls().size());

            Article analyzed = analysisService.analyzeArticle(article);
            return ResponseEntity.ok(ArticleAnalysisResponse.fromArticle(analyzed));

        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(ErrorResponse.of("FETCH_ERROR", e.getMessage()));
        }
    }

    private ResponseEntity<?> analyzeByContent(String content, Article article) {
        if (content.trim().length() < 50) {
            return ResponseEntity.badRequest()
                .body(ErrorResponse.of("VALIDATION_ERROR", "Content is too short. Minimum 50 characters required."));
        }

        String sanitizedContent = contentExtractor.sanitizeContent(content);

        article.setContent(sanitizedContent);
        article.setTitle(contentExtractor.extractTitle(sanitizedContent));
        article.setSourceName("User submitted text");
        article.setImageCount(0);
        article.setImageUrls(List.of());

        Article analyzed = analysisService.analyzeArticle(article);
        return ResponseEntity.ok(ArticleAnalysisResponse.fromArticle(analyzed));
    }

    /** Returns the authenticated user's own analysis history. */
    @GetMapping("/mine")
    public ResponseEntity<?> getMyArticles(@AuthenticationPrincipal User currentUser) {
        List<Article> articles =
            articleRepository.findByUserIdOrderByCreatedAtDesc(currentUser.getId());
        return ResponseEntity.ok(articles);
    }

    /**
     * Legacy route kept for the mobile app. The path userId must match the
     * authenticated user — you cannot read someone else's history.
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getUserArticles(@AuthenticationPrincipal User currentUser,
                                             @PathVariable String userId) {
        if (!currentUser.getId().equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ErrorResponse.of("FORBIDDEN", "You can only access your own articles"));
        }
        List<Article> articles = articleRepository.findByUserIdOrderByCreatedAtDesc(userId);
        return ResponseEntity.ok(articles);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getArticleById(@AuthenticationPrincipal User currentUser,
                                            @PathVariable String id) {
        Article article = articleRepository.findById(id).orElse(null);
        if (article == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ErrorResponse.of("NOT_FOUND", "Article not found"));
        }
        if (!currentUser.getId().equals(article.getUserId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ErrorResponse.of("FORBIDDEN", "You can only access your own articles"));
        }
        return ResponseEntity.ok(article);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteArticle(@AuthenticationPrincipal User currentUser,
                                           @PathVariable String id) {
        Article article = articleRepository.findById(id).orElse(null);
        if (article == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ErrorResponse.of("NOT_FOUND", "Article not found"));
        }
        if (!currentUser.getId().equals(article.getUserId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ErrorResponse.of("FORBIDDEN", "You can only delete your own articles"));
        }
        articleRepository.deleteById(id);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Article deleted successfully");
        return ResponseEntity.ok(response);
    }
}
