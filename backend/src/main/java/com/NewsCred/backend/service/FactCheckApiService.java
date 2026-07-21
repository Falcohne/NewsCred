package com.NewsCred.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.ArrayList;
import java.util.List;

@Service
public class FactCheckApiService {

    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    private static final List<String> FACT_CHECK_ORGANIZATIONS = List.of(
        "Snopes", "FactCheck.org", "PolitiFact", "Reuters Fact Check",
        "AP Fact Check", "BBC Reality Check", "Full Fact", "AFP Fact Check",
        "USA Today Fact Check", "Washington Post Fact Checker"
    );

    public FactCheckApiService() {
        this.webClient = WebClient.builder()
                .defaultHeader("User-Agent", "NewsCred/1.0")
                .build();
        this.objectMapper = new ObjectMapper();
    }

    public List<String> extractClaims(String content) {
        List<String> claims = new ArrayList<>();
        if (content == null) return claims;

        String lowerContent = content.toLowerCase();
        
        String[] claimPatterns = {
            "according to", "source says", "reports suggest", "research shows",
            "study found", "evidence indicates", "claimed that", "stated that",
            "announced that", "confirmed that", "denied that", "alleged that",
            "scientists say", "experts warn", "officials confirm"
        };

        String[] sentences = content.split("[.!?]");
        for (String sentence : sentences) {
            String trimmed = sentence.trim();
            if (trimmed.length() > 30) {
                for (String pattern : claimPatterns) {
                    if (trimmed.toLowerCase().contains(pattern)) {
                        claims.add(trimmed);
                        break;
                    }
                }
            }
        }

        return claims;
    }

    public CrossReferenceResult crossReference(String content) {
        CrossReferenceResult result = new CrossReferenceResult();
        String lowerContent = content.toLowerCase();
        
        List<String> foundSources = new ArrayList<>();
        for (String source : FACT_CHECK_ORGANIZATIONS) {
            if (lowerContent.contains(source.toLowerCase())) {
                foundSources.add(source);
            }
        }

        result.setSourcesFound(foundSources);
        result.setTrustedMentions(foundSources.size());
        result.setScore(foundSources.size() > 0 ? 0.8 : 0.3);
        result.setRecommendation(foundSources.size() > 0 ? 
            "This article references fact-checking sources." : 
            "This article does not reference any fact-checking sources. Consider verifying with Snopes or FactCheck.org.");

        return result;
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
}