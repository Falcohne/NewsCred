package com.NewsCred.backend.controller;

import com.NewsCred.backend.dto.ErrorResponse;
import com.NewsCred.backend.service.NewsFeedService;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/news")
public class NewsController {

    private final NewsFeedService newsFeedService;

    public NewsController(NewsFeedService newsFeedService) {
        this.newsFeedService = newsFeedService;
    }

    @GetMapping
    public ResponseEntity<?> headlines(@RequestParam(defaultValue = "top") String category) {
        if (!newsFeedService.isConfigured()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(ErrorResponse.of("NEWS_NOT_CONFIGURED",
                    "News feed is not configured on this server. Set GNEWS_API_KEY."));
        }

        JsonNode data = newsFeedService.getHeadlines(category);
        if (data == null || !data.has("articles")) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(ErrorResponse.of("NEWS_UNAVAILABLE", "Could not load headlines right now. Try again shortly."));
        }

        List<Map<String, String>> articles = new ArrayList<>();
        for (JsonNode a : data.get("articles")) {
            Map<String, String> item = new HashMap<>();
            item.put("title", a.path("title").asText(""));
            item.put("description", a.path("description").asText(""));
            item.put("url", a.path("url").asText(""));
            item.put("image", a.path("image").asText(""));
            item.put("publishedAt", a.path("publishedAt").asText(""));
            item.put("source", a.path("source").path("name").asText(""));
            articles.add(item);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("category", category);
        response.put("articles", articles);
        return ResponseEntity.ok(response);
    }
}
