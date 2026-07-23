package com.NewsCred.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Trending headlines via the GNews API (https://gnews.io — free tier).
 *
 * Categories: top | ghana | politics | latest.
 * Responses are cached in memory for 20 minutes per category so the
 * whole class demo fits comfortably inside the free daily quota.
 */
@Service
public class NewsFeedService {

    private static final String GNEWS_BASE = "https://gnews.io/api/v4";
    private static final Duration CACHE_TTL = Duration.ofMinutes(20);
    private static final Duration TIMEOUT = Duration.ofSeconds(8);

    private final WebClient webClient;

    @Value("${gnews.api-key:}")
    private String apiKey;

    private static class CacheEntry {
        final JsonNode data;
        final Instant fetchedAt;
        CacheEntry(JsonNode data) { this.data = data; this.fetchedAt = Instant.now(); }
        boolean fresh() { return Instant.now().isBefore(fetchedAt.plus(CACHE_TTL)); }
    }

    private final Map<String, CacheEntry> cache = new ConcurrentHashMap<>();

    public NewsFeedService() {
        this.webClient = WebClient.builder().baseUrl(GNEWS_BASE).build();
    }

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isEmpty();
    }

    public JsonNode getHeadlines(String category) {
        String key = normalize(category);

        CacheEntry cached = cache.get(key);
        if (cached != null && cached.fresh()) {
            return cached.data;
        }

        JsonNode result = fetch(key);
        if (result != null) {
            cache.put(key, new CacheEntry(result));
            return result;
        }
        // Fall back to stale cache rather than failing
        return cached != null ? cached.data : null;
    }

    private String normalize(String category) {
        if (category == null) return "top";
        switch (category.toLowerCase()) {
            case "ghana": case "local": return "ghana";
            case "politics": return "politics";
            case "latest": return "latest";
            default: return "top";
        }
    }

    private JsonNode fetch(String key) {
        try {
            String uri;
            switch (key) {
                case "ghana":
                    // GNews has no Ghana country filter, so search instead
                    uri = "/search?q=Ghana&lang=en&max=15&sortby=publishedAt&apikey=" + apiKey;
                    break;
                case "politics":
                    uri = "/top-headlines?category=politics&lang=en&max=15&apikey=" + apiKey;
                    break;
                case "latest":
                    uri = "/search?q=news&lang=en&max=15&sortby=publishedAt&apikey=" + apiKey;
                    break;
                default: // top
                    uri = "/top-headlines?category=general&lang=en&max=15&apikey=" + apiKey;
            }
            return webClient.get()
                .uri(uri)
                .retrieve()
                .bodyToMono(JsonNode.class)
                .timeout(TIMEOUT)
                .block();
        } catch (Exception e) {
            return null;
        }
    }
}
