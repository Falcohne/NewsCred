package com.NewsCred.backend.entity;

import javax.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "articles")
public class Article {

    @Id
    @GeneratedValue(generator = "uuid")
    @org.hibernate.annotations.GenericGenerator(name = "uuid", strategy = "uuid2")
    private String id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    private String url;

    @Column(name = "source_name")
    private String sourceName;

    @Column(name = "source_reliability")
    private String sourceReliability;

    @Column(name = "content_quality")
    private String contentQuality;

    @Column(name = "evidence_quality")
    private String evidenceQuality;

    @Column(name = "language_tone")
    private String languageTone;

    @Column(name = "fact_consistency")
    private String factConsistency;

    @Column(name = "headline_analysis")
    private String headlineAnalysis;

    @Column(name = "overall_score")
    private Double overallScore;

    @Column(name = "confidence_level")
    private String confidenceLevel;

    @Column(name = "credibility_verdict")
    private String credibilityVerdict;

    @Column(name = "analysis_summary", columnDefinition = "TEXT")
    private String analysisSummary;

    @Column(name = "content_summary", columnDefinition = "TEXT")
    private String summary;

    @Column(name = "user_id")
    private String userId;

    // Date Verification Fields
    @Column(name = "publish_date")
    private LocalDate publishDate;

    @Column(name = "date_status")
    private String dateStatus;

    @Column(name = "date_score")
    private Double dateScore;

    @Column(name = "date_message", columnDefinition = "TEXT")
    private String dateMessage;

    // Author Credibility Fields
    @Column(name = "author_name")
    private String authorName;

    @Column(name = "author_credibility_score")
    private Double authorCredibilityScore;

    @Column(name = "author_status")
    private String authorStatus;

    @Column(name = "author_message", columnDefinition = "TEXT")
    private String authorMessage;

    // Image Verification Fields
    @Column(name = "image_count")
    private Integer imageCount;

    @Column(name = "image_score")
    private Double imageScore;

    @Column(name = "image_status")
    private String imageStatus;

    @Column(name = "image_message", columnDefinition = "TEXT")
    private String imageMessage;

    // 🟢 NEW: Image URLs list
    @ElementCollection
    @CollectionTable(name = "article_images", joinColumns = @JoinColumn(name = "article_id"))
    @Column(name = "image_url", columnDefinition = "TEXT")
    private List<String> imageUrls = new ArrayList<>();

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // ─── GETTERS AND SETTERS ────────────────────────────────────────────────

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }

    public String getSourceName() { return sourceName; }
    public void setSourceName(String sourceName) { this.sourceName = sourceName; }

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

    public Double getOverallScore() { return overallScore; }
    public void setOverallScore(Double overallScore) { this.overallScore = overallScore; }

    public String getConfidenceLevel() { return confidenceLevel; }
    public void setConfidenceLevel(String confidenceLevel) { this.confidenceLevel = confidenceLevel; }

    public String getCredibilityVerdict() { return credibilityVerdict; }
    public void setCredibilityVerdict(String credibilityVerdict) { this.credibilityVerdict = credibilityVerdict; }

    public String getAnalysisSummary() { return analysisSummary; }
    public void setAnalysisSummary(String analysisSummary) { this.analysisSummary = analysisSummary; }

    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    // Date Verification Getters and Setters
    public LocalDate getPublishDate() { return publishDate; }
    public void setPublishDate(LocalDate publishDate) { this.publishDate = publishDate; }

    public String getDateStatus() { return dateStatus; }
    public void setDateStatus(String dateStatus) { this.dateStatus = dateStatus; }

    public Double getDateScore() { return dateScore; }
    public void setDateScore(Double dateScore) { this.dateScore = dateScore; }

    public String getDateMessage() { return dateMessage; }
    public void setDateMessage(String dateMessage) { this.dateMessage = dateMessage; }

    // Author Credibility Getters and Setters
    public String getAuthorName() { return authorName; }
    public void setAuthorName(String authorName) { this.authorName = authorName; }

    public Double getAuthorCredibilityScore() { return authorCredibilityScore; }
    public void setAuthorCredibilityScore(Double authorCredibilityScore) { this.authorCredibilityScore = authorCredibilityScore; }

    public String getAuthorStatus() { return authorStatus; }
    public void setAuthorStatus(String authorStatus) { this.authorStatus = authorStatus; }

    public String getAuthorMessage() { return authorMessage; }
    public void setAuthorMessage(String authorMessage) { this.authorMessage = authorMessage; }

    // Image Verification Getters and Setters
    public Integer getImageCount() { return imageCount; }
    public void setImageCount(Integer imageCount) { this.imageCount = imageCount; }

    public Double getImageScore() { return imageScore; }
    public void setImageScore(Double imageScore) { this.imageScore = imageScore; }

    public String getImageStatus() { return imageStatus; }
    public void setImageStatus(String imageStatus) { this.imageStatus = imageStatus; }

    public String getImageMessage() { return imageMessage; }
    public void setImageMessage(String imageMessage) { this.imageMessage = imageMessage; }

    // 🟢 NEW: Image URLs Getters and Setters
    public List<String> getImageUrls() { return imageUrls; }
    public void setImageUrls(List<String> imageUrls) { this.imageUrls = imageUrls; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}