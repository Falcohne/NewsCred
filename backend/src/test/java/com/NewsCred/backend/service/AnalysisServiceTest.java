package com.NewsCred.backend.service;

import com.NewsCred.backend.entity.Article;
import com.NewsCred.backend.repository.ArticleRepository;
import com.NewsCred.backend.service.FactCheckService.FactCheckResult;
import com.NewsCred.backend.service.GoogleFactCheckService.ExternalClaimMatch;
import com.NewsCred.backend.service.GoogleFactCheckService.ExternalFactCheckResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AnalysisServiceTest {

    @Mock private ArticleRepository articleRepository;
    @Mock private FactCheckService factCheckService;
    @Mock private SummarizationService summarizationService;
    @Mock private DateVerificationService dateVerificationService;
    @Mock private AuthorCredibilityService authorCredibilityService;
    @Mock private ImageVerificationService imageVerificationService;
    @Mock private GoogleFactCheckService googleFactCheckService;
    @Mock private FactCheckApiService factCheckApiService;
    @Mock private TranslationService translationService;

    private AnalysisService analysisService;

    // Deliberately scores HIGH on every local linguistic heuristic:
    // long/structured (content quality), cites data + citations (evidence),
    // no sensational words/exclamations (tone), factual phrases without
    // hedging (fact consistency), and a plain non-clickbait headline.
    private static final String HIGH_QUALITY_CONTENT = String.join(" ",
        Collections.nCopies(15,
            "According to research, data shows that the study found a 42% improvement " +
            "in outcomes, and analysis shows this evidence suggests the trend is reliable " +
            "with clear statistics from the report."));

    @BeforeEach
    void setUp() {
        analysisService = new AnalysisService(articleRepository, factCheckService, summarizationService,
            dateVerificationService, authorCredibilityService, imageVerificationService,
            googleFactCheckService, factCheckApiService, translationService);
    }

    private TranslationService.TranslationResult notConfiguredTranslation() {
        TranslationService.TranslationResult r = new TranslationService.TranslationResult();
        r.setAttempted(false);
        r.setAvailable(false);
        return r;
    }

    /** Common collaborator stubs needed only by the full analyzeArticle() pipeline tests. */
    private void stubCommonPipelineCollaborators() {
        when(articleRepository.save(any(Article.class))).thenAnswer(inv -> inv.getArgument(0));
        when(summarizationService.summarize(any())).thenReturn("A short summary.");
        when(factCheckApiService.extractClaims(any())).thenReturn(List.of());
        when(translationService.translateToEnglish(any())).thenReturn(notConfiguredTranslation());
    }

    private Article buildArticle(String content, String title) {
        Article article = new Article();
        article.setContent(content);
        article.setTitle(title);
        article.setUrl("https://example.com/article");
        article.setSourceName("example.com");
        return article;
    }

    private FactCheckResult goodFactCheckResult() {
        FactCheckResult result = new FactCheckResult();
        result.setSourceReliability("VERIFIED");
        result.setOverallConfidence(0.95);
        result.setClaimVerificationScore(0.9);
        result.setCrossReferenceScore(90);
        result.setMisinformationRiskScore(0.05);
        result.setTrustedReferencesCount(3);
        return result;
    }

    private DateVerificationService.DateVerificationResult perfectDateResult() {
        DateVerificationService.DateVerificationResult result = new DateVerificationService.DateVerificationResult();
        result.setDateFound(true);
        result.setScore(1.0);
        result.setStatus("FRESH");
        result.setMessage("Recently published.");
        return result;
    }

    private AuthorCredibilityService.AuthorCredibilityResult perfectAuthorResult() {
        AuthorCredibilityService.AuthorCredibilityResult result = new AuthorCredibilityService.AuthorCredibilityResult();
        result.setAuthorName("Jane Doe");
        result.setScore(1.0);
        result.setStatus("TRUSTED");
        result.setMessage("Named, verifiable author.");
        return result;
    }

    private ImageVerificationService.ImageVerificationResult perfectImageResult() {
        ImageVerificationService.ImageVerificationResult result = new ImageVerificationService.ImageVerificationResult();
        result.setImageCount(0);
        result.setScore(1.0);
        result.setStatus("OK");
        result.setMessage("No red flags.");
        return result;
    }

    // ---------- verdict thresholds (pure function, tested directly) ----------

    @ParameterizedTest
    @CsvSource({
        "100, CREDIBLE",
        "85, CREDIBLE",
        "84.9, LIKELY_CREDIBLE",
        "65, LIKELY_CREDIBLE",
        "64.9, UNSURE",
        "45, UNSURE",
        "44.9, MISLEADING",
        "25, MISLEADING",
        "24.9, NOT_CREDIBLE",
        "0, NOT_CREDIBLE"
    })
    void determineVerdictThresholdsAreInclusiveOnTheLowerBound(double score, String expectedVerdict) {
        String verdict = ReflectionTestUtils.invokeMethod(analysisService, "determineVerdict", score);
        assertEquals(expectedVerdict, verdict);
    }

    // ---------- content-quality heuristic ----------

    @Test
    void contentQualityIsLowForShortText() {
        String result = ReflectionTestUtils.invokeMethod(analysisService, "analyzeContentQuality", "Too short.");
        assertEquals("LOW", result);
    }

    @Test
    void contentQualityIsHighForLongStructuredText() {
        String result = ReflectionTestUtils.invokeMethod(analysisService, "analyzeContentQuality", HIGH_QUALITY_CONTENT);
        assertEquals("HIGH", result);
    }

    // ---------- evidence-quality heuristic ----------

    @Test
    void evidenceQualityIsHighWithCitationAndData() {
        String content = "According to the report, the data shows a 10% increase in study participants.";
        String result = ReflectionTestUtils.invokeMethod(analysisService, "analyzeEvidenceQuality", content);
        assertEquals("HIGH", result);
    }

    @Test
    void evidenceQualityIsLowWithNeitherCitationNorData() {
        String content = "Something happened yesterday and people talked about it.";
        String result = ReflectionTestUtils.invokeMethod(analysisService, "analyzeEvidenceQuality", content);
        assertEquals("LOW", result);
    }

    // ---------- language-tone heuristic ----------

    @Test
    void languageToneIsLowWithHeavySensationalismAndExclamations() {
        String content = "SHOCKING! This is AMAZING and INCREDIBLE! Truly a devastating scandal!! " +
            "Huge, massive, terrifying, mysterious breaking news!!!";
        String result = ReflectionTestUtils.invokeMethod(analysisService, "analyzeLanguageTone", content);
        assertEquals("LOW", result);
    }

    @Test
    void languageToneIsHighWithNeutralWording() {
        String content = "The council reviewed the proposal and issued a statement about the budget.";
        String result = ReflectionTestUtils.invokeMethod(analysisService, "analyzeLanguageTone", content);
        assertEquals("HIGH", result);
    }

    // ---------- headline heuristic ----------

    @Test
    void headlineIsLowForClickbaitPhrasing() {
        String result = ReflectionTestUtils.invokeMethod(analysisService, "analyzeHeadline",
            "You Won't Believe What Happens Next - The Truth About This Will Shock You");
        assertEquals("LOW", result);
    }

    @Test
    void headlineIsLowForAllCapsTitles() {
        String result = ReflectionTestUtils.invokeMethod(analysisService, "analyzeHeadline",
            "COUNCIL APPROVES NEW BUDGET PLAN");
        assertEquals("LOW", result);
    }

    @Test
    void headlineIsHighForPlainStatement() {
        String result = ReflectionTestUtils.invokeMethod(analysisService, "analyzeHeadline",
            "Council approves new budget plan for next year");
        assertEquals("HIGH", result);
    }

    // ---------- full pipeline: the business-critical behaviors ----------

    @Test
    void highQualityArticleWithNoFactCheckConcernsScoresAsCredible() {
        stubCommonPipelineCollaborators();
        Article article = buildArticle(HIGH_QUALITY_CONTENT, "Council approves new budget plan for next year");

        when(dateVerificationService.verifyDate(any(), any())).thenReturn(perfectDateResult());
        when(authorCredibilityService.checkAuthor(any())).thenReturn(perfectAuthorResult());
        when(imageVerificationService.verifyImages(any())).thenReturn(perfectImageResult());
        when(factCheckService.factCheck(any(), any())).thenReturn(goodFactCheckResult());

        ExternalFactCheckResult noMatches = new ExternalFactCheckResult();
        noMatches.setAttempted(true);
        noMatches.setAvailable(true);
        when(googleFactCheckService.checkClaims(anyList())).thenReturn(noMatches);

        Article result = analysisService.analyzeArticle(article);

        assertTrue(result.getOverallScore() >= 85, "expected a high score, got " + result.getOverallScore());
        assertEquals("CREDIBLE", result.getCredibilityVerdict());
    }

    @Test
    void publishedFalseRatingHardCapsScoreAt40RegardlessOfOtherSignals() {
        // This is the platform's core promise (see README): a professional
        // fact-checker's "False" rating overrides good writing/heuristics.
        stubCommonPipelineCollaborators();
        Article article = buildArticle(HIGH_QUALITY_CONTENT, "Council approves new budget plan for next year");

        when(dateVerificationService.verifyDate(any(), any())).thenReturn(perfectDateResult());
        when(authorCredibilityService.checkAuthor(any())).thenReturn(perfectAuthorResult());
        when(imageVerificationService.verifyImages(any())).thenReturn(perfectImageResult());
        when(factCheckService.factCheck(any(), any())).thenReturn(goodFactCheckResult());

        ExternalClaimMatch falseMatch = new ExternalClaimMatch();
        falseMatch.setPublisher("PolitiFact");
        falseMatch.setRating("False");
        falseMatch.setRatingScore(0.1); // <= 0.25 triggers hasFalseMatch()
        falseMatch.setMatchedClaim("The claim under review.");

        ExternalFactCheckResult withFalseMatch = new ExternalFactCheckResult();
        withFalseMatch.setAttempted(true);
        withFalseMatch.setAvailable(true);
        withFalseMatch.getMatches().add(falseMatch);
        when(googleFactCheckService.checkClaims(anyList())).thenReturn(withFalseMatch);

        Article result = analysisService.analyzeArticle(article);

        assertEquals(40.0, result.getOverallScore(), 0.001);
        assertEquals("MISLEADING", result.getCredibilityVerdict());
    }

    @Test
    void gracefullyHandlesMissingDateAuthorAndImageSignals() {
        // All three collaborators returning null simulates extraction failing
        // entirely (e.g. no date/byline/images found at all) - analyzeArticle
        // must not NPE and should still produce a score and verdict.
        stubCommonPipelineCollaborators();
        Article article = buildArticle("Short piece with little to analyze here today.", "A quiet update");

        when(dateVerificationService.verifyDate(any(), any())).thenReturn(null);
        when(authorCredibilityService.checkAuthor(any())).thenReturn(null);
        when(imageVerificationService.verifyImages(any())).thenReturn(null);
        when(factCheckService.factCheck(any(), any())).thenReturn(goodFactCheckResult());

        ExternalFactCheckResult notConfigured = new ExternalFactCheckResult();
        notConfigured.setAttempted(false);
        notConfigured.setAvailable(false);
        when(googleFactCheckService.checkClaims(anyList())).thenReturn(notConfigured);

        Article result = analysisService.analyzeArticle(article);

        assertNotNull(result.getOverallScore());
        assertNotNull(result.getCredibilityVerdict());
        assertNull(article.getDateStatus()); // never set when the date service returns null outright
    }

    @Test
    void unknownDateStatusIsSetWhenDateIsSearchedForButNotFound() {
        stubCommonPipelineCollaborators();
        Article article = buildArticle("Short piece with little to analyze here today.", "A quiet update");

        DateVerificationService.DateVerificationResult notFound = new DateVerificationService.DateVerificationResult();
        notFound.setDateFound(false);
        when(dateVerificationService.verifyDate(any(), any())).thenReturn(notFound);
        when(authorCredibilityService.checkAuthor(any())).thenReturn(null);
        when(imageVerificationService.verifyImages(any())).thenReturn(null);
        when(factCheckService.factCheck(any(), any())).thenReturn(goodFactCheckResult());

        ExternalFactCheckResult notConfigured = new ExternalFactCheckResult();
        notConfigured.setAttempted(false);
        notConfigured.setAvailable(false);
        when(googleFactCheckService.checkClaims(anyList())).thenReturn(notConfigured);

        analysisService.analyzeArticle(article);

        assertEquals("DATE_UNKNOWN", article.getDateStatus());
        assertEquals(0.5, article.getDateScore(), 0.001);
    }

    // ---------- translation ----------

    @Test
    void nonEnglishContentIsTranslatedBeforeScoringAndLanguageIsRecorded() {
        stubCommonPipelineCollaborators();
        Article article = buildArticle("Ceci est un article en français.", "Titre en français");

        TranslationService.TranslationResult contentTranslation = new TranslationService.TranslationResult();
        contentTranslation.setAttempted(true);
        contentTranslation.setAvailable(true);
        contentTranslation.setDetectedLanguage("fr");
        contentTranslation.setTranslatedText(HIGH_QUALITY_CONTENT);

        TranslationService.TranslationResult titleTranslation = new TranslationService.TranslationResult();
        titleTranslation.setAttempted(true);
        titleTranslation.setAvailable(true);
        titleTranslation.setDetectedLanguage("fr");
        titleTranslation.setTranslatedText("Title in English");

        when(translationService.translateToEnglish("Ceci est un article en français."))
            .thenReturn(contentTranslation);
        when(translationService.translateToEnglish("Titre en français"))
            .thenReturn(titleTranslation);
        when(dateVerificationService.verifyDate(any(), any())).thenReturn(null);
        when(authorCredibilityService.checkAuthor(any())).thenReturn(null);
        when(imageVerificationService.verifyImages(any())).thenReturn(null);
        when(factCheckService.factCheck(any(), any())).thenReturn(goodFactCheckResult());
        ExternalFactCheckResult noMatches = new ExternalFactCheckResult();
        noMatches.setAttempted(true);
        noMatches.setAvailable(true);
        when(googleFactCheckService.checkClaims(anyList())).thenReturn(noMatches);

        Article result = analysisService.analyzeArticle(article);

        assertEquals("fr", result.getDetectedLanguage());
        assertEquals(HIGH_QUALITY_CONTENT, result.getContent());
        assertEquals("Title in English", result.getTitle());
        assertTrue(result.getAnalysisSummary().contains("Translated from FR"));
    }

    @Test
    void englishContentIsLeftUnchangedWhenDetectedLanguageIsEnglish() {
        stubCommonPipelineCollaborators();
        Article article = buildArticle(HIGH_QUALITY_CONTENT, "Council approves new budget plan for next year");

        TranslationService.TranslationResult englishDetected = new TranslationService.TranslationResult();
        englishDetected.setAttempted(true);
        englishDetected.setAvailable(true);
        englishDetected.setDetectedLanguage("en");
        englishDetected.setTranslatedText(HIGH_QUALITY_CONTENT);
        when(translationService.translateToEnglish(HIGH_QUALITY_CONTENT)).thenReturn(englishDetected);
        when(dateVerificationService.verifyDate(any(), any())).thenReturn(null);
        when(authorCredibilityService.checkAuthor(any())).thenReturn(null);
        when(imageVerificationService.verifyImages(any())).thenReturn(null);
        when(factCheckService.factCheck(any(), any())).thenReturn(goodFactCheckResult());
        ExternalFactCheckResult noMatches = new ExternalFactCheckResult();
        noMatches.setAttempted(true);
        noMatches.setAvailable(true);
        when(googleFactCheckService.checkClaims(anyList())).thenReturn(noMatches);

        Article result = analysisService.analyzeArticle(article);

        assertNull(result.getDetectedLanguage());
        assertEquals("Council approves new budget plan for next year", result.getTitle());
        assertFalse(result.getAnalysisSummary().contains("Translated from"));
    }

    @Test
    void translationNotConfiguredLeavesContentUnchanged() {
        stubCommonPipelineCollaborators(); // stubs translateToEnglish to "not attempted"
        Article article = buildArticle(HIGH_QUALITY_CONTENT, "Council approves new budget plan for next year");

        when(dateVerificationService.verifyDate(any(), any())).thenReturn(null);
        when(authorCredibilityService.checkAuthor(any())).thenReturn(null);
        when(imageVerificationService.verifyImages(any())).thenReturn(null);
        when(factCheckService.factCheck(any(), any())).thenReturn(goodFactCheckResult());
        ExternalFactCheckResult noMatches = new ExternalFactCheckResult();
        noMatches.setAttempted(true);
        noMatches.setAvailable(true);
        when(googleFactCheckService.checkClaims(anyList())).thenReturn(noMatches);

        Article result = analysisService.analyzeArticle(article);

        assertNull(result.getDetectedLanguage());
        assertEquals(HIGH_QUALITY_CONTENT, result.getContent());
    }
}
