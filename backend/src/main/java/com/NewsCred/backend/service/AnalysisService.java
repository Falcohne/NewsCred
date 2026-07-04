package com.NewsCred.backend.service;

import com.NewsCred.backend.entity.Article;
import com.NewsCred.backend.repository.ArticleRepository;
import com.NewsCred.backend.service.DateVerificationService.DateVerificationResult;
import com.NewsCred.backend.service.FactCheckService.FactCheckResult;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AnalysisService {

    private final ArticleRepository articleRepository;
    private final FactCheckService factCheckService;
    private final SummarizationService summarizationService;
    private final DateVerificationService dateVerificationService;
    private final AuthorCredibilityService authorCredibilityService;
    private final ImageVerificationService imageVerificationService;

    private static final double ORIGINAL_WEIGHT = 0.35;
    private static final double FACT_CHECK_WEIGHT = 0.25;
    private static final double DATE_WEIGHT = 0.15;
    private static final double AUTHOR_WEIGHT = 0.15;
    private static final double IMAGE_WEIGHT = 0.10;

    public AnalysisService(ArticleRepository articleRepository, 
                           FactCheckService factCheckService,
                           SummarizationService summarizationService,
                           DateVerificationService dateVerificationService,
                           AuthorCredibilityService authorCredibilityService,
                           ImageVerificationService imageVerificationService) {
        this.articleRepository = articleRepository;
        this.factCheckService = factCheckService;
        this.summarizationService = summarizationService;
        this.dateVerificationService = dateVerificationService;
        this.authorCredibilityService = authorCredibilityService;
        this.imageVerificationService = imageVerificationService;
    }

    @Transactional
    public Article analyzeArticle(Article article) {
        String contentSummary = summarizationService.summarize(article.getContent());
        article.setSummary(contentSummary);

        DateVerificationResult dateResult = dateVerificationService.verifyDate(
            article.getContent(), 
            article.getUrl()
        );
        if (dateResult != null) {
            if (dateResult.isDateFound()) {
                article.setPublishDate(dateResult.getPublishDate());
                article.setDateStatus(dateResult.getStatus());
                article.setDateScore(dateResult.getScore());
                article.setDateMessage(dateResult.getMessage());
            } else {
                article.setDateStatus("DATE_UNKNOWN");
                article.setDateScore(0.5);
                article.setDateMessage("Could not determine the publish date.");
            }
        }

        AuthorCredibilityService.AuthorCredibilityResult authorResult = 
            authorCredibilityService.checkAuthor(article.getContent());
        if (authorResult != null) {
            article.setAuthorName(authorResult.getAuthorName());
            article.setAuthorCredibilityScore(authorResult.getScore());
            article.setAuthorStatus(authorResult.getStatus());
            article.setAuthorMessage(authorResult.getMessage());
        }

        ImageVerificationService.ImageVerificationResult imageResult = null;
        if (article.getImageUrls() != null && !article.getImageUrls().isEmpty()) {
            imageResult = imageVerificationService.verifyImagesFromUrls(article.getImageUrls());
        } else {
            imageResult = imageVerificationService.verifyImages(article.getContent());
        }
        
        if (imageResult != null) {
            article.setImageCount(imageResult.getImageCount());
            article.setImageScore(imageResult.getScore());
            article.setImageStatus(imageResult.getStatus());
            article.setImageMessage(imageResult.getMessage());
        }

        FactCheckResult factCheckResult = factCheckService.factCheck(
            article.getContent(), 
            article.getSourceName()
        );

        String sourceReliability = factCheckResult.getSourceReliability();
        article.setSourceReliability(sourceReliability);

        String contentQuality = analyzeContentQuality(article.getContent());
        article.setContentQuality(contentQuality);

        String evidenceQuality = analyzeEvidenceQuality(article.getContent());
        article.setEvidenceQuality(evidenceQuality);

        String languageTone = analyzeLanguageTone(article.getContent());
        article.setLanguageTone(languageTone);

        String factConsistency = analyzeFactConsistency(article.getContent());
        article.setFactConsistency(factConsistency);

        String headlineAnalysis = analyzeHeadline(article.getTitle());
        article.setHeadlineAnalysis(headlineAnalysis);

        double originalScore = calculateOriginalScore(
            sourceReliability, contentQuality, evidenceQuality,
            languageTone, factConsistency, headlineAnalysis
        );
        
        double factCheckConfidence = factCheckResult.getOverallConfidence() * 100;
        
        double dateScore = dateResult != null ? dateResult.getScore() * 100 : 50;
        
        double authorScore = authorResult != null ? authorResult.getScore() * 100 : 50;
        
        double imageScore = imageResult != null ? imageResult.getScore() * 100 : 50;
        
        double overallScore = (originalScore * ORIGINAL_WEIGHT) + 
                              (factCheckConfidence * FACT_CHECK_WEIGHT) + 
                              (dateScore * DATE_WEIGHT) + 
                              (authorScore * AUTHOR_WEIGHT) +
                              (imageScore * IMAGE_WEIGHT);
        
        // Ensure score is between 0 and 100
        overallScore = Math.min(Math.max(overallScore, 0), 100);
        article.setOverallScore(overallScore);

        String confidenceLevel = factCheckResult.getConfidenceLabel();
        article.setConfidenceLevel(confidenceLevel);

        String verdict = determineVerdict(overallScore);
        article.setCredibilityVerdict(verdict);

        String analysisSummary = generateSummaryWithAllVerifications(
            verdict, overallScore, sourceReliability, factCheckResult, 
            contentSummary, dateResult, authorResult, imageResult
        );
        article.setAnalysisSummary(analysisSummary);

        return articleRepository.save(article);
    }

    private String analyzeContentQuality(String content) {
        if (content == null || content.length() < 100) return "LOW";
        int sentences = content.split("[.!?]").length;
        int words = content.split("\\s+").length;
        if (sentences > 10 && words > 200) return "HIGH";
        if (sentences > 5 && words > 100) return "MEDIUM";
        return "LOW";
    }

    private String analyzeEvidenceQuality(String content) {
        if (content == null) return "LOW";
        boolean hasCitation = content.contains("according to") || content.contains("source") ||
                             content.contains("study") || content.contains("research") || 
                             content.contains("experts");
        boolean hasData = content.contains("%") || content.contains("data") || 
                         content.contains("statistics") || content.contains("report");
        if (hasCitation && hasData) return "HIGH";
        if (hasCitation || hasData) return "MEDIUM";
        return "LOW";
    }

    private String analyzeLanguageTone(String content) {
        if (content == null) return "LOW";
        String lower = content.toLowerCase();
        int sensationalCount = 0;
        String[] sensationalWords = {"shocking", "amazing", "incredible", "unbelievable", "breaking",
            "exclusive", "devastating", "scandal", "huge", "massive", "terrifying", "mysterious"};
        for (String word : sensationalWords) {
            if (lower.contains(word)) sensationalCount++;
        }
        int exclamationCount = content.length() - content.replace("!", "").length();
        if (sensationalCount < 3 && exclamationCount < 2) return "HIGH";
        if (sensationalCount < 6 && exclamationCount < 4) return "MEDIUM";
        return "LOW";
    }

    private String analyzeFactConsistency(String content) {
        if (content == null) return "MEDIUM";
        String lower = content.toLowerCase();
        int factualPhrases = 0;
        String[] factualIndicators = {"according to", "data shows", "research indicates", "study found",
            "evidence suggests", "experts say", "analysis shows", "report states"};
        for (String phrase : factualIndicators) {
            if (lower.contains(phrase)) factualPhrases++;
        }
        int hedgingCount = 0;
        String[] hedgingWords = {"maybe", "perhaps", "could", "might", "possibly", "allegedly", "rumored", "speculated"};
        for (String word : hedgingWords) {
            if (lower.contains(word)) hedgingCount++;
        }
        if (factualPhrases >= 3 && hedgingCount < 3) return "HIGH";
        if (factualPhrases >= 1) return "MEDIUM";
        return "LOW";
    }

    private String analyzeHeadline(String title) {
        if (title == null || title.isEmpty()) return "MEDIUM";
        String lower = title.toLowerCase();
        boolean isAllCaps = title.equals(title.toUpperCase()) && title.length() > 5;
        int clickbaitCount = 0;
        String[] clickbaitPhrases = {"you won't believe", "this will shock", "what happens next",
            "change everything", "nobody knows", "the truth about", "secret to", "will surprise you"};
        for (String phrase : clickbaitPhrases) {
            if (lower.contains(phrase)) clickbaitCount++;
        }
        int questionMarks = title.length() - title.replace("?", "").length();
        if (isAllCaps || clickbaitCount >= 2 || questionMarks > 1) return "LOW";
        if (clickbaitCount == 1 || questionMarks == 1) return "MEDIUM";
        return "HIGH";
    }

    /**
     * Calculate the original score based on 6 credibility indicators
     * Returns a value between 0 and 100
     */
    private double calculateOriginalScore(String source, String content, String evidence,
                                          String tone, String facts, String headline) {
        double sourceScore = scoreValue(source);
        double contentScore = scoreValue(content);
        double evidenceScore = scoreValue(evidence);
        double toneScore = scoreValue(tone);
        double factsScore = scoreValue(facts);
        double headlineScore = scoreValue(headline);
        
        // Each score is between 0 and 1, multiply by 100 to get percentage
        double rawScore = (sourceScore * 0.20 + contentScore * 0.15 + 
                          evidenceScore * 0.20 + toneScore * 0.15 + 
                          factsScore * 0.15 + headlineScore * 0.15) * 100;
        
        // Ensure the score is between 0 and 100
        return Math.min(Math.max(rawScore, 0), 100);
    }

    /**
     * Convert string value to numeric score between 0 and 1
     */
    private double scoreValue(String value) {
        if (value == null) return 0.5;
        switch (value.toUpperCase()) {
            case "HIGH": return 1.0;
            case "MEDIUM": return 0.5;
            case "LOW": return 0.1;
            default: return 0.5;
        }
    }

    private String determineVerdict(double score) {
        if (score >= 85) return "CREDIBLE";
        if (score >= 65) return "LIKELY_CREDIBLE";
        if (score >= 45) return "UNSURE";
        if (score >= 25) return "MISLEADING";
        return "NOT_CREDIBLE";
    }

    private String generateSummaryWithAllVerifications(String verdict, double score, 
                                                 String source, FactCheckResult factCheck,
                                                 String contentSummary,
                                                 DateVerificationResult dateResult,
                                                 AuthorCredibilityService.AuthorCredibilityResult authorResult,
                                                 ImageVerificationService.ImageVerificationResult imageResult) {
        StringBuilder summary = new StringBuilder();
        summary.append("ARTICLE SUMMARY\n\n");
        summary.append(contentSummary).append("\n\n");
        
        summary.append("CREDIBILITY ANALYSIS\n\n");
        summary.append("Based on comprehensive analysis including 6 credibility indicators, ");
        summary.append("fact-check verification, date verification, author credibility check, ");
        summary.append("and image verification, this article is ");
        summary.append(verdict.toLowerCase().replace("_", " ")).append(" with a score of ");
        summary.append(String.format("%.1f", score)).append("%.\n\n");
        
        summary.append("FACT-CHECK RESULTS:\n");
        summary.append("Source Reliability: ").append(source.toLowerCase()).append("\n");
        summary.append("Claim Verification: ").append(String.format("%.0f", factCheck.getClaimVerificationScore() * 100)).append("%\n");
        summary.append("Cross-Reference Score: ").append(String.format("%.0f", factCheck.getCrossReferenceScore())).append("%\n");
        summary.append("Misinformation Risk: ").append(String.format("%.0f", factCheck.getMisinformationRiskScore() * 100)).append("%\n");
        summary.append("Trusted References: ").append(factCheck.getTrustedReferencesCount()).append(" sources\n");
        
        if (dateResult != null && dateResult.isDateFound()) {
            summary.append("\nDATE VERIFICATION:\n");
            summary.append("Published: ").append(dateResult.getPublishDate()).append("\n");
            summary.append("Days Old: ").append(dateResult.getDaysOld()).append(" days\n");
            summary.append("Status: ").append(dateResult.getStatusLabel()).append("\n");
            summary.append(dateResult.getMessage()).append("\n");
        } else if (dateResult != null && !dateResult.isDateFound()) {
            summary.append("\nDATE VERIFICATION:\n");
            summary.append("Status: Date Unknown\n");
            summary.append("Could not determine the publish date of this article.\n");
        }
        
        if (authorResult != null && authorResult.getAuthorName() != null) {
            summary.append("\nAUTHOR CREDIBILITY:\n");
            summary.append("Author: ").append(authorResult.getAuthorName()).append("\n");
            summary.append("Credibility Score: ").append(String.format("%.0f", authorResult.getScore() * 100)).append("%\n");
            summary.append("Status: ").append(authorResult.getStatusLabel()).append("\n");
            summary.append(authorResult.getMessage()).append("\n");
        } else if (authorResult != null && authorResult.getAuthorName() == null) {
            summary.append("\nAUTHOR CREDIBILITY:\n");
            summary.append("No author name found.\n");
            summary.append("Status: Unknown\n");
            summary.append(authorResult.getMessage() != null ? authorResult.getMessage() : "Author information not available.").append("\n");
        }
        
        if (imageResult != null) {
            summary.append("\nIMAGE VERIFICATION:\n");
            summary.append("Images Found: ").append(imageResult.getImageCount()).append("\n");
            summary.append("Status: ").append(imageResult.getStatusLabel()).append("\n");
            if (imageResult.getImageCount() > 0) {
                summary.append("Stock Photos: ").append(imageResult.getStockPhotoCount()).append("\n");
                if (imageResult.isHasAIIndicators()) {
                    summary.append("AI-Generated Images Detected\n");
                }
                if (imageResult.isHasManipulationSigns()) {
                    summary.append("Manipulation Signs Found\n");
                }
            }
            summary.append(imageResult.getMessage()).append("\n");
        }
        
        summary.append("\nRECOMMENDATION: ").append(factCheck.getRecommendation());
        
        return summary.toString();
    }
}