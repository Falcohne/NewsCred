package com.NewsCred.backend.service;

import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class AuthorCredibilityService {



    private static final List<String> REPUTABLE_ORGANIZATIONS = Arrays.asList(
        "bbc", "reuters", "ap", "associated press", "the guardian", "new york times",
        "washington post", "cnn", "npr", "al jazeera", "bloomberg", "wsj",
        "the economist", "time", "newsweek", "forbes", "harvard", "mit", "stanford",
        "oxford", "cambridge", "national geographic", "scientific american", "nature"
    );

    public AuthorCredibilityResult checkAuthor(String content) {
        AuthorCredibilityResult result = new AuthorCredibilityResult();
        
        String authorName = extractAuthorName(content);
        result.setAuthorName(authorName);
        
        if (authorName == null || authorName.isEmpty()) {
            String lowerContent = content.toLowerCase();
            boolean fromReputableOrg = REPUTABLE_ORGANIZATIONS.stream()
                .anyMatch(lowerContent::contains);
            
            if (fromReputableOrg) {
                result.setScore(0.8);
                result.setStatus("REPUTABLE_ORG");
                result.setMessage("This article is from a reputable news organization.");
                result.setRecommendation("The organization is trusted.");
            } else {
                result.setScore(0.3);
                result.setStatus("UNKNOWN");
                result.setMessage("No author name found.");
                result.setRecommendation("Please verify the source independently.");
            }
            return result;
        }
        
        String lowerName = authorName.toLowerCase();
        // Honest heuristic: we cannot verify individual authors offline.
        // A named byline is a positive transparency signal; affiliation with a
        // reputable organization strengthens it. We never claim an author is
        // personally "trusted" - only that the article is transparent about
        // who wrote it.
        String lowerContent2 = content.toLowerCase();
        boolean orgAffiliated = REPUTABLE_ORGANIZATIONS.stream()
            .anyMatch(lowerContent2::contains);

        if (orgAffiliated) {
            result.setScore(0.8);
            result.setStatus("NAMED_WITH_ORG");
            result.setMessage("Article has a named author and references a reputable organization.");
            result.setRecommendation("Good transparency. You can look up this author's other work to verify further.");
        } else {
            result.setScore(0.6);
            result.setStatus("NAMED_AUTHOR");
            result.setMessage("Article has a named author, which is a positive transparency signal.");
            result.setRecommendation("Author identity could not be independently verified. Consider searching for their other published work.");
        }

        return result;
    }

    private String extractAuthorName(String content) {
        if (content == null || content.isEmpty()) return null;
        
        String text = content.substring(0, Math.min(content.length(), 2000));
        
        // Pattern 1: "By [Name]" - most common
        Pattern p = Pattern.compile("By\\s+([A-Z][a-z]+\\s+[A-Z][a-z]+)", Pattern.CASE_INSENSITIVE);
        Matcher m = p.matcher(text);
        if (m.find()) {
            return m.group(1);
        }
        
        // Pattern 2: "Author: [Name]"
        p = Pattern.compile("Author:\\s*([A-Z][a-z]+\\s+[A-Z][a-z]+)", Pattern.CASE_INSENSITIVE);
        m = p.matcher(text);
        if (m.find()) {
            return m.group(1);
        }
        
        // Pattern 3: "by [Name]" (lowercase by)
        p = Pattern.compile("by\\s+([A-Z][a-z]+\\s+[A-Z][a-z]+)", Pattern.CASE_INSENSITIVE);
        m = p.matcher(text);
        if (m.find()) {
            return m.group(1);
        }
        
        // Pattern 4: "[Name] - [Title]" pattern
        p = Pattern.compile("^([A-Z][a-z]+\\s+[A-Z][a-z]+)\\s*-\\s*", Pattern.CASE_INSENSITIVE);
        m = p.matcher(text);
        if (m.find()) {
            return m.group(1);
        }
        
        // Pattern 5: "Written by [Name]"
        p = Pattern.compile("Written by\\s+([A-Z][a-z]+\\s+[A-Z][a-z]+)", Pattern.CASE_INSENSITIVE);
        m = p.matcher(text);
        if (m.find()) {
            return m.group(1);
        }
        
        // Pattern 6: "Posted by [Name]"
        p = Pattern.compile("Posted by\\s+([A-Z][a-z]+\\s+[A-Z][a-z]+)", Pattern.CASE_INSENSITIVE);
        m = p.matcher(text);
        if (m.find()) {
            return m.group(1);
        }
        
        // Pattern 7: Look for name in meta tags (simulated)
        p = Pattern.compile("author\"?\\s*content=\"([A-Z][a-z]+\\s+[A-Z][a-z]+)\"", Pattern.CASE_INSENSITIVE);
        m = p.matcher(text);
        if (m.find()) {
            return m.group(1);
        }
        
        // Pattern 8: Look for name at start of article (first sentence)
        String[] sentences = text.split("[.!?]");
        if (sentences.length > 0) {
            String firstSentence = sentences[0].trim();
            p = Pattern.compile("^([A-Z][a-z]+\\s+[A-Z][a-z]+)\\s+\\w+", Pattern.CASE_INSENSITIVE);
            m = p.matcher(firstSentence);
            if (m.find()) {
                return m.group(1);
            }
        }
        
        return null;
    }

    public static class AuthorCredibilityResult {
        private String authorName;
        private double score;
        private String status;
        private String message;
        private String recommendation;

        public String getAuthorName() { return authorName; }
        public void setAuthorName(String authorName) { this.authorName = authorName; }
        public double getScore() { return score; }
        public void setScore(double score) { this.score = score; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
        public String getRecommendation() { return recommendation; }
        public void setRecommendation(String recommendation) { this.recommendation = recommendation; }

        public String getStatusLabel() {
            switch (status) {
                case "TRUSTED": return "Trusted Author";
                case "REPUTABLE_ORG": return "Reputable Organization";
                case "UNKNOWN_AUTHOR": return "Unknown Author";
                case "UNKNOWN": return "Unknown";
                default: return "Unknown";
            }
        }
    }
}