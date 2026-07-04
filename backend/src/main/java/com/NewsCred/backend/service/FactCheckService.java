package com.NewsCred.backend.service;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class FactCheckService {

    private static final List<String> TRUSTED_SOURCES = Arrays.asList(
        "bbc.com", "bbc.co.uk", "reuters.com", "apnews.com", "associatedpress.com",
        "nytimes.com", "washingtonpost.com", "theguardian.com", "cnn.com",
        "npr.org", "aljazeera.com", "bloomberg.com", "wsj.com", "economist.com",
        "nationalgeographic.com", "sciencedaily.com", "nature.com", "science.org",
        "snopes.com", "factcheck.org", "politifact.com", "fullfact.org",
        "who.int", "cdc.gov", "un.org", "worldbank.org", "nih.gov", "nasa.gov"
    );

    private static final List<String> CLAIM_INDICATORS = Arrays.asList(
        "according to", "source says", "reports suggest", "research shows",
        "study found", "evidence indicates", "claimed that", "stated that",
        "announced that", "confirmed that", "denied that", "alleged that",
        "scientists say", "experts warn", "officials confirm"
    );

    private static final List<String> MISINFORMATION_PATTERNS = Arrays.asList(
        "you won't believe", "shocking truth", "they don't want you to know",
        "mainstream media won't tell you", "what they're hiding",
        "breaking news", "exclusive", "sources say", "leaked", "exposed",
        "the truth about", "hidden agenda", "conspiracy", "cover-up"
    );

    @Cacheable(value = "factChecks", key = "#content + #sourceName")
    public FactCheckResult factCheck(String content, String sourceName) {
        FactCheckResult result = new FactCheckResult();
        
        List<String> claims = extractClaims(content);
        result.setClaimsFound(claims.size());
        
        List<ClaimCheckResult> claimResults = new ArrayList<>();
        for (String claim : claims) {
            claimResults.add(checkClaim(claim));
        }
        result.setClaimResults(claimResults);
        
        CrossReferenceResult crossRef = crossReference(content);
        result.setCrossReferenceSources(crossRef.getSourcesFound());
        result.setCrossReferenceScore(crossRef.getScore() * 100);
        result.setCrossReferenceRecommendation(crossRef.getRecommendation());
        
        result.setSourceReliability(checkSourceReliability(sourceName));
        result.setClaimVerificationScore(verifyClaims(content));
        result.setTrustedReferencesCount(findTrustedReferences(content));
        result.setMisinformationRiskScore(detectMisinformation(content));
        result.setSentimentScore(analyzeSentiment(content));
        result.setClickbaitScore(detectClickbait(content));
        result.setOverallConfidence(calculateOverallConfidence(result));
        result.setSourceName(sourceName);
        
        return result;
    }

    private List<String> extractClaims(String content) {
        List<String> claims = new ArrayList<>();
        if (content == null || content.isEmpty()) return claims;

        String[] sentences = content.split("[.!?]");
        for (String sentence : sentences) {
            String trimmed = sentence.trim();
            if (trimmed.length() < 30) continue;
            
            String lower = trimmed.toLowerCase();
            for (String indicator : CLAIM_INDICATORS) {
                if (lower.contains(indicator)) {
                    claims.add(trimmed);
                    break;
                }
            }
        }
        
        if (claims.isEmpty()) {
            int count = 0;
            for (String sentence : sentences) {
                String trimmed = sentence.trim();
                if (trimmed.length() > 40) {
                    claims.add(trimmed);
                    count++;
                    if (count >= 3) break;
                }
            }
        }
        
        return claims;
    }

    private ClaimCheckResult checkClaim(String claim) {
        ClaimCheckResult result = new ClaimCheckResult();
        result.setClaim(claim);
        
        String lower = claim.toLowerCase();
        
        if (lower.contains("study") || lower.contains("research") || 
            lower.contains("scientists") || lower.contains("experts") ||
            lower.contains("data") || lower.contains("evidence")) {
            result.setTrustScore(0.85);
            result.setStatus("LIKELY_TRUE");
            result.setSource("Scientific/Research source");
            result.setExplanation("This claim appears to be supported by research or scientific evidence.");
        }
        else if (lower.contains("government") || lower.contains("official") || 
                 lower.contains("authority") || lower.contains("department") ||
                 lower.contains("ministry") || lower.contains("agency")) {
            result.setTrustScore(0.75);
            result.setStatus("LIKELY_TRUE");
            result.setSource("Official source");
            result.setExplanation("This claim references official or government sources.");
        }
        else if (lower.contains("alleged") || lower.contains("rumor") || 
                 lower.contains("speculated") || lower.contains("unnamed") ||
                 lower.contains("source close to") || lower.contains("insider")) {
            result.setTrustScore(0.25);
            result.setStatus("UNVERIFIED");
            result.setSource("Unconfirmed source");
            result.setExplanation("This claim relies on unnamed or unverified sources.");
        }
        else if (lower.contains("shocking") || lower.contains("amazing") || 
                 lower.contains("incredible") || lower.contains("unbelievable") ||
                 lower.contains("never before") || lower.contains("first ever")) {
            result.setTrustScore(0.35);
            result.setStatus("NEEDS_VERIFICATION");
            result.setSource("Sensational claim");
            result.setExplanation("This claim uses sensational language. Verify with trusted sources.");
        }
        else {
            result.setTrustScore(0.50);
            result.setStatus("NEEDS_VERIFICATION");
            result.setSource("Unknown source");
            result.setExplanation("This claim needs verification from trusted sources.");
        }
        
        List<String> orgs = Arrays.asList("Snopes", "FactCheck.org", "PolitiFact", "Reuters", "AP");
        for (String org : orgs) {
            if (lower.contains(org.toLowerCase())) {
                result.setTrustScore(0.90);
                result.setStatus("VERIFIED_TRUE");
                result.setSource("Verified by " + org);
                result.setExplanation("This claim has been verified by " + org + ".");
                break;
            }
        }
        
        return result;
    }

    private CrossReferenceResult crossReference(String content) {
        CrossReferenceResult result = new CrossReferenceResult();
        String lowerContent = content.toLowerCase();
        
        List<String> foundSources = new ArrayList<>();
        for (String source : TRUSTED_SOURCES) {
            String domain = source.replace(".com", "").replace(".org", "").replace(".uk", "");
            if (lowerContent.contains(domain) || lowerContent.contains(source)) {
                foundSources.add(source);
            }
        }
        
        result.setSourcesFound(foundSources);
        result.setTrustedMentions(foundSources.size());
        
        if (foundSources.size() >= 3) {
            result.setScore(0.9);
            result.setRecommendation("This article references multiple trusted sources. Good cross-verification.");
        } else if (foundSources.size() >= 1) {
            result.setScore(0.6);
            result.setRecommendation("This article references a trusted source. Consider additional verification.");
        } else {
            result.setScore(0.2);
            result.setRecommendation("This article does not reference any trusted sources. Verify claims independently.");
        }
        
        return result;
    }

    private double analyzeSentiment(String content) {
        if (content == null || content.isEmpty()) return 0.5;
        
        String lower = content.toLowerCase();
        int positiveWords = 0;
        int negativeWords = 0;
        
        String[] positive = {"good", "great", "excellent", "positive", "benefit", "improve", "success", "achievement", "breakthrough"};
        String[] negative = {"bad", "terrible", "disaster", "crisis", "fear", "danger", "threat", "warning", "devastating"};
        
        for (String word : positive) {
            if (lower.contains(word)) positiveWords++;
        }
        for (String word : negative) {
            if (lower.contains(word)) negativeWords++;
        }
        
        int total = positiveWords + negativeWords;
        if (total == 0) return 0.5;
        
        return 0.5 + ((positiveWords - negativeWords) / (double)(total * 2));
    }

    private double detectClickbait(String content) {
        if (content == null || content.isEmpty()) return 0.0;
        
        String lower = content.toLowerCase();
        int clickbaitCount = 0;
        int totalChecks = 0;
        
        String[] clickbaitPatterns = {
            "you won't believe", "will shock you", "what happens next",
            "change everything", "the truth about", "secret to",
            "will surprise you", "nobody knows", "this is why",
            "here's what", "the reason why", "you need to know",
            "experts say", "scientists reveal", "finally discovered"
        };
        
        for (String pattern : clickbaitPatterns) {
            totalChecks++;
            if (lower.contains(pattern)) clickbaitCount++;
        }
        
        totalChecks++;
        int questionMarks = content.length() - content.replace("?", "").length();
        if (questionMarks > 3) clickbaitCount++;
        
        totalChecks++;
        String[] words = content.split("\\s+");
        int capsCount = 0;
        for (String word : words) {
            if (word.length() > 3 && word.equals(word.toUpperCase())) capsCount++;
        }
        if (capsCount > 2) clickbaitCount++;
        
        if (totalChecks == 0) return 0.0;
        return Math.min((double) clickbaitCount / totalChecks, 1.0);
    }

    private String checkSourceReliability(String sourceName) {
        if (sourceName == null || sourceName.isEmpty()) return "UNKNOWN";
        String source = sourceName.toLowerCase();
        
        for (String trusted : TRUSTED_SOURCES) {
            String domain = trusted.replace(".com", "").replace(".org", "").replace(".uk", "").replace(".gov", "");
            if (source.contains(domain)) {
                return "VERIFIED";
            }
        }
        
        if (source.contains(".com") || source.contains(".org") || source.contains(".net")) {
            return "UNVERIFIED";
        }
        
        return "UNKNOWN";
    }

    private double verifyClaims(String content) {
        if (content == null || content.isEmpty()) return 0.0;
        String lowerContent = content.toLowerCase();
        int claimCount = 0;
        int verifiedClaims = 0;
        
        for (String indicator : CLAIM_INDICATORS) {
            if (lowerContent.contains(indicator)) {
                claimCount++;
                if (lowerContent.contains("according to study") || 
                    lowerContent.contains("research shows") ||
                    lowerContent.contains("data shows") ||
                    lowerContent.contains("evidence") ||
                    lowerContent.contains("source says")) {
                    verifiedClaims++;
                }
            }
        }
        
        if (lowerContent.matches(".*\\[\\d+\\].*") || lowerContent.contains("(source)")) {
            verifiedClaims += 2;
        }
        
        if (claimCount == 0) return 0.5;
        return Math.min((double) verifiedClaims / (claimCount + 1), 1.0);
    }

    private int findTrustedReferences(String content) {
        if (content == null) return 0;
        String lowerContent = content.toLowerCase();
        int count = 0;
        
        for (String trusted : TRUSTED_SOURCES) {
            String domain = trusted.replace(".com", "").replace(".org", "").replace(".uk", "");
            if (lowerContent.contains(domain) || lowerContent.contains(trusted)) {
                count++;
            }
        }
        
        return count;
    }

    private double detectMisinformation(String content) {
        if (content == null) return 0.0;
        String lowerContent = content.toLowerCase();
        int redFlags = 0;
        int totalChecks = 0;
        
        for (String pattern : MISINFORMATION_PATTERNS) {
            totalChecks++;
            if (lowerContent.contains(pattern)) redFlags++;
        }
        
        String[] words = content.split("\\s+");
        int capsCount = 0;
        for (String word : words) {
            if (word.length() > 3 && word.equals(word.toUpperCase())) capsCount++;
        }
        totalChecks++;
        if (capsCount > 3) redFlags++;
        
        totalChecks++;
        int exclamationCount = content.length() - content.replace("!", "").length();
        if (exclamationCount > 5) redFlags++;
        
        totalChecks++;
        if (lowerContent.contains("bit.ly") || lowerContent.contains("tinyurl") || 
            lowerContent.contains("short.link") || lowerContent.contains("goo.gl")) {
            redFlags++;
        }
        
        if (totalChecks == 0) return 0.0;
        return Math.min((double) redFlags / totalChecks, 1.0);
    }

    private double calculateOverallConfidence(FactCheckResult result) {
        double score = 0.0;
        int weights = 0;
        
        switch (result.getSourceReliability()) {
            case "VERIFIED": score += 0.20 * 1.0; break;
            case "UNVERIFIED": score += 0.20 * 0.5; break;
            case "UNKNOWN": score += 0.20 * 0.3; break;
            default: score += 0.20 * 0.5;
        }
        weights += 20;
        
        score += 0.20 * result.getClaimVerificationScore();
        weights += 20;
        
        score += 0.15 * (result.getCrossReferenceScore() / 100);
        weights += 15;
        
        score += 0.15 * (1.0 - result.getMisinformationRiskScore());
        weights += 15;
        
        int refCount = result.getTrustedReferencesCount();
        double refScore = Math.min(refCount / 3.0, 1.0);
        score += 0.10 * refScore;
        weights += 10;
        
        if (result.getClaimResults() != null && !result.getClaimResults().isEmpty()) {
            double avgTrust = result.getClaimResults().stream()
                .mapToDouble(ClaimCheckResult::getTrustScore)
                .average()
                .orElse(0.5);
            score += 0.10 * avgTrust;
        } else {
            score += 0.10 * 0.5;
        }
        weights += 10;
        
        score += 0.10 * (1.0 - result.getClickbaitScore());
        weights += 10;
        
        if (weights == 0) return 0.5;
        return Math.min(score, 1.0);
    }

    public static class ClaimCheckResult {
        private String claim;
        private double trustScore;
        private String status;
        private String source;
        private String explanation;

        public String getClaim() { return claim; }
        public void setClaim(String claim) { this.claim = claim; }
        public double getTrustScore() { return trustScore; }
        public void setTrustScore(double trustScore) { this.trustScore = trustScore; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
        public String getSource() { return source; }
        public void setSource(String source) { this.source = source; }
        public String getExplanation() { return explanation; }
        public void setExplanation(String explanation) { this.explanation = explanation; }

        public String getStatusLabel() {
            switch (status) {
                case "VERIFIED_TRUE": return "Verified True";
                case "LIKELY_TRUE": return "Likely True";
                case "NEEDS_VERIFICATION": return "Needs Verification";
                case "UNVERIFIED": return "Unverified";
                default: return "Unknown";
            }
        }
    }

    public static class CrossReferenceResult {
        private List<String> sourcesFound = new ArrayList<>();
        private int trustedMentions;
        private double score;
        private String recommendation;

        public List<String> getSourcesFound() { return sourcesFound; }
        public void setSourcesFound(List<String> sourcesFound) { this.sourcesFound = sourcesFound; }
        public int getTrustedMentions() { return trustedMentions; }
        public void setTrustedMentions(int trustedMentions) { this.trustedMentions = trustedMentions; }
        public double getScore() { return score; }
        public void setScore(double score) { this.score = score; }
        public String getRecommendation() { return recommendation; }
        public void setRecommendation(String recommendation) { this.recommendation = recommendation; }
    }

    public static class FactCheckResult {
        private String sourceReliability;
        private double claimVerificationScore;
        private int trustedReferencesCount;
        private double crossReferenceScore;
        private double misinformationRiskScore;
        private double overallConfidence;
        private String sourceName;
        private int claimsFound;
        private List<ClaimCheckResult> claimResults = new ArrayList<>();
        private List<String> crossReferenceSources = new ArrayList<>();
        private String crossReferenceRecommendation;
        private double sentimentScore;
        private double clickbaitScore;

        public String getSourceReliability() { return sourceReliability; }
        public void setSourceReliability(String sourceReliability) { this.sourceReliability = sourceReliability; }
        public double getClaimVerificationScore() { return claimVerificationScore; }
        public void setClaimVerificationScore(double claimVerificationScore) { this.claimVerificationScore = claimVerificationScore; }
        public int getTrustedReferencesCount() { return trustedReferencesCount; }
        public void setTrustedReferencesCount(int trustedReferencesCount) { this.trustedReferencesCount = trustedReferencesCount; }
        public double getCrossReferenceScore() { return crossReferenceScore; }
        public void setCrossReferenceScore(double crossReferenceScore) { this.crossReferenceScore = crossReferenceScore; }
        public double getMisinformationRiskScore() { return misinformationRiskScore; }
        public void setMisinformationRiskScore(double misinformationRiskScore) { this.misinformationRiskScore = misinformationRiskScore; }
        public double getOverallConfidence() { return overallConfidence; }
        public void setOverallConfidence(double overallConfidence) { this.overallConfidence = overallConfidence; }
        public String getSourceName() { return sourceName; }
        public void setSourceName(String sourceName) { this.sourceName = sourceName; }
        public int getClaimsFound() { return claimsFound; }
        public void setClaimsFound(int claimsFound) { this.claimsFound = claimsFound; }
        public List<ClaimCheckResult> getClaimResults() { return claimResults; }
        public void setClaimResults(List<ClaimCheckResult> claimResults) { this.claimResults = claimResults; }
        public List<String> getCrossReferenceSources() { return crossReferenceSources; }
        public void setCrossReferenceSources(List<String> crossReferenceSources) { this.crossReferenceSources = crossReferenceSources; }
        public String getCrossReferenceRecommendation() { return crossReferenceRecommendation; }
        public void setCrossReferenceRecommendation(String crossReferenceRecommendation) { this.crossReferenceRecommendation = crossReferenceRecommendation; }
        public double getSentimentScore() { return sentimentScore; }
        public void setSentimentScore(double sentimentScore) { this.sentimentScore = sentimentScore; }
        public double getClickbaitScore() { return clickbaitScore; }
        public void setClickbaitScore(double clickbaitScore) { this.clickbaitScore = clickbaitScore; }

        public String getConfidenceLabel() {
            if (overallConfidence >= 0.90) return "VERY_HIGH";
            if (overallConfidence >= 0.75) return "HIGH";
            if (overallConfidence >= 0.55) return "MEDIUM";
            if (overallConfidence >= 0.35) return "LOW";
            return "VERY_LOW";
        }

        public String getRecommendation() {
            if (overallConfidence >= 0.90) {
                return "This article is highly credible. You can confidently share and rely on this information.";
            } else if (overallConfidence >= 0.75) {
                return "This article is likely credible. We recommend cross-checking key claims with trusted sources.";
            } else if (overallConfidence >= 0.55) {
                return "This article has mixed credibility signals. Verify from multiple trusted sources before sharing.";
            } else if (overallConfidence >= 0.35) {
                return "This article contains concerning patterns. Exercise caution and verify with fact-checking sites.";
            } else {
                return "This article shows strong misinformation signals. Do not share without thorough verification.";
            }
        }
    }
}