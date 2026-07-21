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

        String path = request.getRequestURI();
        if (!path.startsWith("/api/")) {
            filterChain.doFilter(request, response);
            return;
        }

        if (path.startsWith("/api/auth/")) {
            filterChain.doFilter(request, response);
            return;
        }

        String clientIp = getClientIp(request);
        boolean isPremium = Boolean.parseBoolean(request.getHeader("X-User-Premium"));
        
        String key = clientIp;
        String userId = request.getHeader("X-User-Id");
        if (userId != null && !userId.isEmpty()) {
            key = "user:" + userId;
        }

        if (rateLimitingConfig.allowRequest(key, isPremium)) {
            int remaining = rateLimitingConfig.getRemainingRequests(key, isPremium);
            response.setHeader("X-RateLimit-Remaining", String.valueOf(remaining));
            filterChain.doFilter(request, response);
        } else {
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
        
        if (ip == null || ip.isEmpty() || "0:0:0:0:0:0:0:1".equals(ip)) {
            ip = "127.0.0.1";
        }
        
        return ip;
    }
}