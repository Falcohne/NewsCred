package com.NewsCred.backend.dto;

import com.NewsCred.backend.entity.Article;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public class ArticleAnalysisResponse {
    private String articleId;
    private String title;
    private String sourceName;
    private String content;
    private Double overallScore;
    private String confidenceLevel;
    private String credibilityVerdict;
    private String analysisSummary;
    private String contentSummary;
    private String factCheckDetails;
    private String sourceReliability;
    private String contentQuality;
    private String evidenceQuality;
    private String languageTone;
    private String factConsistency;
    private String headlineAnalysis;
    private Integer imageCount;
    private List<String> imageUrls;
    private LocalDateTime createdAt;
    private boolean success;
    private String message;

    private LocalDate publishDate;
    private String dateStatus;
    private Double dateScore;
    private String dateMessage;
    private String authorName;
    private Double authorCredibilityScore;
    private String authorStatus;
    private String authorMessage;

    public static ArticleAnalysisResponse fromArticle(Article article) {
        ArticleAnalysisResponse response = new ArticleAnalysisResponse();
        response.setArticleId(article.getId());
        response.setTitle(article.getTitle());
        response.setSourceName(article.getSourceName());
        response.setContent(article.getContent());
        response.setOverallScore(article.getOverallScore());
        response.setConfidenceLevel(article.getConfidenceLevel());
        response.setCredibilityVerdict(article.getCredibilityVerdict());
        response.setAnalysisSummary(article.getAnalysisSummary());
        response.setContentSummary(article.getContentSummary());
        response.setFactCheckDetails(article.getFactCheckDetails());
        response.setSourceReliability(article.getSourceReliability());
        response.setContentQuality(article.getContentQuality());
        response.setEvidenceQuality(article.getEvidenceQuality());
        response.setLanguageTone(article.getLanguageTone());
        response.setFactConsistency(article.getFactConsistency());
        response.setHeadlineAnalysis(article.getHeadlineAnalysis());
        response.setImageCount(article.getImageCount());
        response.setImageUrls(article.getImageUrls());
        response.setCreatedAt(article.getCreatedAt());
        response.setSuccess(true);

        response.setPublishDate(article.getPublishDate());
        response.setDateStatus(article.getDateStatus());
        response.setDateScore(article.getDateScore());
        response.setDateMessage(article.getDateMessage());
        response.setAuthorName(article.getAuthorName());
        response.setAuthorCredibilityScore(article.getAuthorCredibilityScore());
        response.setAuthorStatus(article.getAuthorStatus());
        response.setAuthorMessage(article.getAuthorMessage());

        return response;
    }

    public String getArticleId() { return articleId; }
    public void setArticleId(String articleId) { this.articleId = articleId; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getSourceName() { return sourceName; }
    public void setSourceName(String sourceName) { this.sourceName = sourceName; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public Double getOverallScore() { return overallScore; }
    public void setOverallScore(Double overallScore) { this.overallScore = overallScore; }
    public String getConfidenceLevel() { return confidenceLevel; }
    public void setConfidenceLevel(String confidenceLevel) { this.confidenceLevel = confidenceLevel; }
    public String getCredibilityVerdict() { return credibilityVerdict; }
    public void setCredibilityVerdict(String credibilityVerdict) { this.credibilityVerdict = credibilityVerdict; }
    public String getAnalysisSummary() { return analysisSummary; }
    public void setAnalysisSummary(String analysisSummary) { this.analysisSummary = analysisSummary; }
    public String getContentSummary() { return contentSummary; }
    public void setContentSummary(String contentSummary) { this.contentSummary = contentSummary; }
    public String getSourceReliability() { return sourceReliability; }
    public void setSourceReliability(String sourceReliability) { this.sourceReliability = sourceReliability; }
    public String getContentQuality() { return contentQuality; }
    public void setContentQuality(String contentQuality) { this.contentQuality = contentQuality; }
    public String getEvidenceQuality() { return evidenceQuality; }
    public void setEvidenceQuality(String evidenceQuality) { this.evidenceQuality = evidenceQuality; }
    public String getLanguageTone() { return languageTone; }
    public void setLanguageTone(String languageTone) { this.languageTone = languageTone; }
    public String getFactConsistency() { return factConsistency; }
    public void setFactConsistency(String factConsistency) { this.factConsistency = factConsistency; }
    public String getHeadlineAnalysis() { return headlineAnalysis; }
    public void setHeadlineAnalysis(String headlineAnalysis) { this.headlineAnalysis = headlineAnalysis; }
    public Integer getImageCount() { return imageCount; }
    public void setImageCount(Integer imageCount) { this.imageCount = imageCount; }
    public List<String> getImageUrls() { return imageUrls; }
    public void setImageUrls(List<String> imageUrls) { this.imageUrls = imageUrls; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public LocalDate getPublishDate() { return publishDate; }
    public void setPublishDate(LocalDate publishDate) { this.publishDate = publishDate; }
    public String getDateStatus() { return dateStatus; }
    public void setDateStatus(String dateStatus) { this.dateStatus = dateStatus; }
    public Double getDateScore() { return dateScore; }
    public void setDateScore(Double dateScore) { this.dateScore = dateScore; }
    public String getDateMessage() { return dateMessage; }
    public void setDateMessage(String dateMessage) { this.dateMessage = dateMessage; }
    public String getAuthorName() { return authorName; }
    public void setAuthorName(String authorName) { this.authorName = authorName; }
    public Double getAuthorCredibilityScore() { return authorCredibilityScore; }
    public void setAuthorCredibilityScore(Double authorCredibilityScore) { this.authorCredibilityScore = authorCredibilityScore; }
    public String getAuthorStatus() { return authorStatus; }
    public void setAuthorStatus(String authorStatus) { this.authorStatus = authorStatus; }
    public String getAuthorMessage() { return authorMessage; }
    public void setAuthorMessage(String authorMessage) { this.authorMessage = authorMessage; }

    public String getFactCheckDetails() { return factCheckDetails; }
    public void setFactCheckDetails(String factCheckDetails) { this.factCheckDetails = factCheckDetails; }
}