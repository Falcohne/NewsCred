package com.NewsCred.backend.controller;

import com.NewsCred.backend.dto.ArticleAnalysisRequest;
import com.NewsCred.backend.dto.ArticleAnalysisResponse;
import com.NewsCred.backend.dto.ErrorResponse;
import com.NewsCred.backend.entity.Article;
import com.NewsCred.backend.repository.ArticleRepository;
import com.NewsCred.backend.service.AnalysisService;
import com.NewsCred.backend.service.ContentExtractorService;
import com.NewsCred.backend.service.FetchResult;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/articles")
public class ArticleController {

    private final AnalysisService analysisService;
    private final ArticleRepository articleRepository;
    private final ContentExtractorService contentExtractor;

    public ArticleController(AnalysisService analysisService, 
                            ArticleRepository articleRepository,
                            ContentExtractorService contentExtractor) {
        this.analysisService = analysisService;
        this.articleRepository = articleRepository;
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
    public ResponseEntity<?> analyzeArticle(@Valid @RequestBody ArticleAnalysisRequest request) {
        try {
            if (request.getUserId() == null || request.getUserId().trim().isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(ErrorResponse.of("VALIDATION_ERROR", "User ID is required"));
            }

            boolean hasUrl = request.getUrl() != null && !request.getUrl().trim().isEmpty();
            boolean hasContent = request.getContent() != null && !request.getContent().trim().isEmpty();
            
            if (!hasUrl && !hasContent) {
                return ResponseEntity.badRequest()
                    .body(ErrorResponse.of("VALIDATION_ERROR", "Please provide either a URL or article content"));
            }

            Article article = new Article();
            article.setUserId(request.getUserId());

            if (hasUrl) {
                return analyzeByUrl(request.getUrl().trim(), article);
            } else {
                return analyzeByContent(request.getContent().trim(), article);
            }

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

    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getUserArticles(@PathVariable String userId) {
        try {
            UUID.fromString(userId);
            List<Article> articles = articleRepository.findByUserIdOrderByCreatedAtDesc(userId);
            return ResponseEntity.ok(articles);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                .body(ErrorResponse.of("VALIDATION_ERROR", "Invalid user ID format"));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getArticleById(@PathVariable String id) {
        try {
            UUID.fromString(id);
            Article article = articleRepository.findById(id).orElse(null);
            if (article == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ErrorResponse.of("NOT_FOUND", "Article not found"));
            }
            return ResponseEntity.ok(article);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                .body(ErrorResponse.of("VALIDATION_ERROR", "Invalid article ID format"));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteArticle(@PathVariable String id) {
        try {
            UUID.fromString(id);
            if (!articleRepository.existsById(id)) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ErrorResponse.of("NOT_FOUND", "Article not found"));
            }
            articleRepository.deleteById(id);
            Map<String, String> response = new HashMap<>();
            response.put("message", "Article deleted successfully");
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                .body(ErrorResponse.of("VALIDATION_ERROR", "Invalid article ID format"));
        }
    }
}