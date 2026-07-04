package com.NewsCred.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
import javax.annotation.PreDestroy;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@Component
public class RateLimitingConfig {

    @Value("${rate.limit.default.requests:10}")
    private int maxRequests;

    @Value("${rate.limit.premium.requests:50}")
    private int premiumMaxRequests;

    @Value("${rate.limit.window.seconds:60}")
    private long timeWindowSeconds;

    private final Map<String, RateLimitInfo> requestCounts = new ConcurrentHashMap<>();
    private final ScheduledExecutorService cleanupExecutor = Executors.newSingleThreadScheduledExecutor();

    private static final long CLEANUP_INTERVAL_MINUTES = 5;

    @PostConstruct
    public void init() {
        cleanupExecutor.scheduleAtFixedRate(
            this::cleanupExpiredEntries,
            CLEANUP_INTERVAL_MINUTES,
            CLEANUP_INTERVAL_MINUTES,
            TimeUnit.MINUTES
        );
    }

    @PreDestroy
    public void destroy() {
        cleanupExecutor.shutdown();
        try {
            if (!cleanupExecutor.awaitTermination(5, TimeUnit.SECONDS)) {
                cleanupExecutor.shutdownNow();
            }
        } catch (InterruptedException e) {
            cleanupExecutor.shutdownNow();
            Thread.currentThread().interrupt();
        }
    }

    public boolean allowRequest(String key, boolean isPremium) {
        if (key == null || key.trim().isEmpty()) {
            return false;
        }

        int maxAllowed = isPremium ? premiumMaxRequests : maxRequests;
        
        RateLimitInfo info = requestCounts.computeIfAbsent(key, k -> new RateLimitInfo());
        
        synchronized (info) {
            long now = Instant.now().getEpochSecond();
            long elapsedSeconds = now - info.windowStart;
            
            if (elapsedSeconds >= timeWindowSeconds) {
                info.windowStart = now;
                info.count = 1;
                info.lastRequestTime = now;
                return true;
            }
            
            if (info.count >= maxAllowed) {
                info.lastRequestTime = now;
                return false;
            }
            
            info.count++;
            info.lastRequestTime = now;
            return true;
        }
    }

    public int getRemainingRequests(String key, boolean isPremium) {
        if (key == null) {
            return isPremium ? premiumMaxRequests : maxRequests;
        }

        int maxAllowed = isPremium ? premiumMaxRequests : maxRequests;
        
        RateLimitInfo info = requestCounts.get(key);
        if (info == null) {
            return maxAllowed;
        }
        
        synchronized (info) {
            long now = Instant.now().getEpochSecond();
            if (now - info.windowStart >= timeWindowSeconds) {
                return maxAllowed;
            }
            return Math.max(0, maxAllowed - info.count);
        }
    }

    public long getResetTime(String key) {
        RateLimitInfo info = requestCounts.get(key);
        if (info == null) {
            return 0;
        }
        synchronized (info) {
            long elapsed = Instant.now().getEpochSecond() - info.windowStart;
            return Math.max(0, timeWindowSeconds - elapsed);
        }
    }

    private void cleanupExpiredEntries() {
        long now = Instant.now().getEpochSecond();
        long expiryTime = now - (timeWindowSeconds * 10);
        
        requestCounts.entrySet().removeIf(entry -> {
            synchronized (entry.getValue()) {
                return entry.getValue().lastRequestTime < expiryTime;
            }
        });
    }

    public void clearAll() {
        requestCounts.clear();
    }

    public void clearForKey(String key) {
        requestCounts.remove(key);
    }

    private static class RateLimitInfo {
        long windowStart = Instant.now().getEpochSecond();
        int count = 0;
        long lastRequestTime = windowStart;
    }
}