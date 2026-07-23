package com.NewsCred.backend.controller;

import com.NewsCred.backend.dto.ErrorResponse;
import com.NewsCred.backend.entity.User;
import com.NewsCred.backend.service.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Admin dashboard API. Every endpoint requires an authenticated user whose
 * isAdmin flag is true (granted via the ADMIN_EMAILS allowlist at login -
 * see AdminAccessService). Anyone else gets 403, same pattern used
 * elsewhere in this codebase (manual check rather than method security
 * annotations, for consistency).
 */
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminDashboardService dashboardService;
    private final PaystackService paystackService;
    private final GoogleFactCheckService googleFactCheckService;
    private final NewsFeedService newsFeedService;
    private final PasswordResetService passwordResetService;

    public AdminController(AdminDashboardService dashboardService,
                           PaystackService paystackService,
                           GoogleFactCheckService googleFactCheckService,
                           NewsFeedService newsFeedService,
                           PasswordResetService passwordResetService) {
        this.dashboardService = dashboardService;
        this.paystackService = paystackService;
        this.googleFactCheckService = googleFactCheckService;
        this.newsFeedService = newsFeedService;
        this.passwordResetService = passwordResetService;
    }

    private ResponseEntity<?> requireAdmin(User currentUser) {
        if (currentUser == null || !currentUser.isAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ErrorResponse.of("FORBIDDEN", "Admin access required"));
        }
        return null;
    }

    @GetMapping("/overview")
    public ResponseEntity<?> overview(@AuthenticationPrincipal User currentUser) {
        ResponseEntity<?> denied = requireAdmin(currentUser);
        if (denied != null) return denied;
        return ResponseEntity.ok(dashboardService.getOverview());
    }

    @GetMapping("/verdicts")
    public ResponseEntity<?> verdicts(@AuthenticationPrincipal User currentUser) {
        ResponseEntity<?> denied = requireAdmin(currentUser);
        if (denied != null) return denied;
        return ResponseEntity.ok(dashboardService.getVerdictDistribution());
    }

    @GetMapping("/sources")
    public ResponseEntity<?> sources(@AuthenticationPrincipal User currentUser,
                                     @RequestParam(defaultValue = "10") int limit) {
        ResponseEntity<?> denied = requireAdmin(currentUser);
        if (denied != null) return denied;
        return ResponseEntity.ok(dashboardService.getSourceLeaderboard(limit));
    }

    @GetMapping("/activity")
    public ResponseEntity<?> activity(@AuthenticationPrincipal User currentUser,
                                      @RequestParam(defaultValue = "10") int limit) {
        ResponseEntity<?> denied = requireAdmin(currentUser);
        if (denied != null) return denied;
        return ResponseEntity.ok(dashboardService.getRecentActivity(limit));
    }

    @GetMapping("/users")
    public ResponseEntity<?> users(@AuthenticationPrincipal User currentUser) {
        ResponseEntity<?> denied = requireAdmin(currentUser);
        if (denied != null) return denied;
        return ResponseEntity.ok(dashboardService.getUserDirectory());
    }

    @PutMapping("/users/{userId}/premium")
    public ResponseEntity<?> setPremium(@AuthenticationPrincipal User currentUser,
                                        @PathVariable String userId,
                                        @RequestBody Map<String, Boolean> body) {
        ResponseEntity<?> denied = requireAdmin(currentUser);
        if (denied != null) return denied;

        Boolean premium = body.get("premium");
        if (premium == null) {
            return ResponseEntity.badRequest()
                .body(ErrorResponse.of("VALIDATION_ERROR", "\"premium\" (true/false) is required"));
        }

        boolean ok = dashboardService.setPremiumStatus(userId, premium, currentUser.getEmail());
        if (!ok) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ErrorResponse.of("NOT_FOUND", "User not found"));
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("success", true);
        response.put("userId", userId);
        response.put("premium", premium);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/audit-log")
    public ResponseEntity<?> auditLog(@AuthenticationPrincipal User currentUser,
                                      @RequestParam(defaultValue = "20") int limit) {
        ResponseEntity<?> denied = requireAdmin(currentUser);
        if (denied != null) return denied;
        return ResponseEntity.ok(dashboardService.getAuditLog(limit));
    }

    @GetMapping("/flagged")
    public ResponseEntity<?> flagged(@AuthenticationPrincipal User currentUser,
                                     @RequestParam(defaultValue = "20") int limit) {
        ResponseEntity<?> denied = requireAdmin(currentUser);
        if (denied != null) return denied;
        return ResponseEntity.ok(dashboardService.getFlaggedContent(limit));
    }

    @GetMapping("/trend")
    public ResponseEntity<?> trend(@AuthenticationPrincipal User currentUser) {
        ResponseEntity<?> denied = requireAdmin(currentUser);
        if (denied != null) return denied;
        return ResponseEntity.ok(dashboardService.getWeeklyTrend());
    }

    @GetMapping("/health")
    public ResponseEntity<?> health(@AuthenticationPrincipal User currentUser) {
        ResponseEntity<?> denied = requireAdmin(currentUser);
        if (denied != null) return denied;

        Map<String, Object> health = new LinkedHashMap<>();
        health.put("paystack", paystackService.isConfigured());
        health.put("googleFactCheck", googleFactCheckService.isConfigured());
        health.put("gnews", newsFeedService.isConfigured());
        health.put("mail", passwordResetService.isMailConfigured());
        return ResponseEntity.ok(health);
    }
}
