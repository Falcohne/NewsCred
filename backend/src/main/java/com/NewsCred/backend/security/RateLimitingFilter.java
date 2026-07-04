package com.NewsCred.backend.security;

import com.NewsCred.backend.config.RateLimitingConfig;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

@Component
public class RateLimitingFilter extends OncePerRequestFilter {

    private final RateLimitingConfig rateLimitingConfig;

    public RateLimitingFilter(RateLimitingConfig rateLimitingConfig) {
        this.rateLimitingConfig = rateLimitingConfig;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        // Only apply rate limiting to API endpoints
        String path = request.getRequestURI();
        if (!path.startsWith("/api/")) {
            filterChain.doFilter(request, response);
            return;
        }

        // Skip rate limiting for auth endpoints (login, register)
        if (path.startsWith("/api/auth/")) {
            filterChain.doFilter(request, response);
            return;
        }

        // Get client identifier (IP address)
        String clientIp = getClientIp(request);
        
        // Check if user is premium (from header)
        boolean isPremium = Boolean.parseBoolean(request.getHeader("X-User-Premium"));
        
        // Use IP as key for rate limiting
        String key = clientIp;
        
        // If user is authenticated, use userId instead
        String userId = request.getHeader("X-User-Id");
        if (userId != null && !userId.isEmpty()) {
            key = "user:" + userId;
        }

        // Check if request is allowed
        if (rateLimitingConfig.allowRequest(key, isPremium)) {
            // Add rate limit headers
            int remaining = rateLimitingConfig.getRemainingRequests(key, isPremium);
            response.setHeader("X-RateLimit-Remaining", String.valueOf(remaining));
            filterChain.doFilter(request, response);
        } else {
            // Rate limit exceeded - return 429
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType("application/json");
            response.getWriter().write("{\"error\": \"Too many requests\", \"message\": \"Rate limit exceeded. Please try again later.\"}");
        }
    }

    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        return ip;
    }
}