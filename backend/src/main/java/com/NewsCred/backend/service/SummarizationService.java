package com.NewsCred.backend.service;

import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class SummarizationService {

    private static final int DEFAULT_MAX_SENTENCES = 4;
    private static final int SHORT_MAX_SENTENCES = 2;
    private static final int MIN_SENTENCE_LENGTH = 20;
    private static final Set<String> STOP_WORDS = new HashSet<>(Arrays.asList(
        "the", "a", "an", "of", "to", "for", "with", "on", "at", "from", "by",
        "in", "that", "this", "was", "are", "were", "have", "has", "had", "will",
        "would", "could", "should", "may", "might", "must", "is", "it", "as",
        "be", "or", "and", "so", "but", "not", "all", "any", "can", "did",
        "get", "has", "her", "him", "his", "how", "its", "man", "may", "our",
        "she", "them", "they", "was", "you", "he", "me", "my", "us", "we"
    ));

    public String summarize(String content, int maxSentences) {
        if (content == null || content.trim().isEmpty()) {
            return "No content available to summarize.";
        }

        List<String> sentences = extractSentences(content);
        
        if (sentences.isEmpty()) {
            return "Content too short to summarize.";
        }

        if (sentences.size() <= maxSentences) {
            return String.join(". ", sentences) + ".";
        }

        Map<String, Integer> wordFrequency = calculateWordFrequency(sentences);
        
        Map<Integer, Double> sentenceScores = scoreSentences(sentences, wordFrequency);
        
        List<Integer> topIndices = getTopSentenceIndices(sentenceScores, maxSentences);
        
        List<String> topSentences = topIndices.stream()
            .sorted()
            .map(sentences::get)
            .collect(Collectors.toList());

        String summary = String.join(". ", topSentences);
        if (!summary.endsWith(".")) {
            summary += ".";
        }
        
        return summary;
    }

    public String summarize(String content) {
        return summarize(content, DEFAULT_MAX_SENTENCES);
    }

    public String summarizeShort(String content) {
        return summarize(content, SHORT_MAX_SENTENCES);
    }

    private List<String> extractSentences(String content) {
        String[] rawSentences = content.split("[.!?]");
        List<String> sentences = new ArrayList<>();
        
        for (String s : rawSentences) {
            String trimmed = s.trim();
            if (trimmed.length() >= MIN_SENTENCE_LENGTH) {
                sentences.add(trimmed);
            }
        }
        
        return sentences;
    }

    private Map<String, Integer> calculateWordFrequency(List<String> sentences) {
        Map<String, Integer> wordFrequency = new HashMap<>();
        
        for (String sentence : sentences) {
            String[] words = sentence.toLowerCase()
                .replaceAll("[^a-zA-Z\\s]", "")
                .split("\\s+");
            
            for (String word : words) {
                if (word.length() > 2 && !STOP_WORDS.contains(word)) {
                    wordFrequency.put(word, wordFrequency.getOrDefault(word, 0) + 1);
                }
            }
        }
        
        return wordFrequency;
    }

    private Map<Integer, Double> scoreSentences(List<String> sentences, Map<String, Integer> wordFrequency) {
        Map<Integer, Double> sentenceScores = new HashMap<>();
        
        for (int i = 0; i < sentences.size(); i++) {
            String sentence = sentences.get(i);
            String[] words = sentence.toLowerCase()
                .replaceAll("[^a-zA-Z\\s]", "")
                .split("\\s+");
            
            double score = 0.0;
            for (String word : words) {
                if (word.length() > 2 && !STOP_WORDS.contains(word)) {
                    score += wordFrequency.getOrDefault(word, 0);
                }
            }
            
            if (words.length > 0) {
                score = score / words.length;
            }
            
            if (sentence.matches(".*[A-Z][a-z]+.*")) {
                score *= 1.3;
            }
            
            if (sentence.matches(".*\\d+.*")) {
                score *= 1.1;
            }
            
            if (sentence.matches(".*\\b(according|study|research|data|evidence|shows|indicates|find|discover|conclude|suggest)\\b.*")) {
                score *= 1.4;
            }
            
            if (i == 0) {
                score *= 1.2;
            }
            
            if (i == sentences.size() - 1) {
                score *= 1.1;
            }
            
            sentenceScores.put(i, score);
        }
        
        return sentenceScores;
    }

    private List<Integer> getTopSentenceIndices(Map<Integer, Double> sentenceScores, int maxSentences) {
        return sentenceScores.entrySet().stream()
            .sorted((a, b) -> b.getValue().compareTo(a.getValue()))
            .limit(maxSentences)
            .map(Map.Entry::getKey)
            .collect(Collectors.toList());
    }

    public String extractFirstSentence(String content) {
        if (content == null || content.isEmpty()) return "Untitled";
        String[] sentences = content.split("[.!?]");
        for (String s : sentences) {
            String trimmed = s.trim();
            if (trimmed.length() > 10) {
                return trimmed;
            }
        }
        return content.substring(0, Math.min(50, content.length()));
    }
}