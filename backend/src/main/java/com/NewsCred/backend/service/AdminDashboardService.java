package com.NewsCred.backend.service;

import com.NewsCred.backend.entity.Article;
import com.NewsCred.backend.entity.Payment;
import com.NewsCred.backend.entity.User;
import com.NewsCred.backend.entity.AdminAction;
import com.NewsCred.backend.repository.AdminActionRepository;
import com.NewsCred.backend.repository.ArticleRepository;
import com.NewsCred.backend.repository.PaymentRepository;
import com.NewsCred.backend.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Aggregates platform-wide statistics for the admin dashboard.
 * Simple in-memory aggregation over findAll() - appropriate at class-project
 * scale; would move to SQL aggregate queries at real production scale.
 */
@Service
public class AdminDashboardService {

    private final UserRepository userRepository;
    private final ArticleRepository articleRepository;
    private final PaymentRepository paymentRepository;
    private final AdminActionRepository adminActionRepository;

    public AdminDashboardService(UserRepository userRepository,
                                 ArticleRepository articleRepository,
                                 PaymentRepository paymentRepository,
                                 AdminActionRepository adminActionRepository) {
        this.userRepository = userRepository;
        this.articleRepository = articleRepository;
        this.paymentRepository = paymentRepository;
        this.adminActionRepository = adminActionRepository;
    }

    /** user@example.com -> u***@example.com */
    public static String maskEmail(String email) {
        if (email == null || !email.contains("@")) return email;
        String[] parts = email.split("@", 2);
        String local = parts[0];
        String masked = local.length() <= 1 ? local + "***" : local.charAt(0) + "***";
        return masked + "@" + parts[1];
    }

    /** Full user directory, newest first. Emails are masked by default. */
    public List<Map<String, Object>> getUserDirectory() {
        return userRepository.findAll().stream()
            .sorted(Comparator.comparing(User::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
            .map(u -> {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("id", u.getId());
                row.put("fullName", u.getFullName());
                row.put("maskedEmail", maskEmail(u.getEmail()));
                row.put("fullEmail", u.getEmail());
                row.put("premium", u.isPremium());
                row.put("isAdmin", u.isAdmin());
                row.put("analysisCount", u.getAnalysisCount());
                row.put("createdAt", u.getCreatedAt());
                return row;
            })
            .collect(Collectors.toList());
    }

    /** Grant or revoke premium for a user, logging the action. Returns false if user not found. */
    public boolean setPremiumStatus(String targetUserId, boolean premium, String adminEmail) {
        User target = userRepository.findById(targetUserId).orElse(null);
        if (target == null) return false;

        target.setPremium(premium);
        userRepository.save(target);

        AdminAction log = new AdminAction();
        log.setAdminEmail(adminEmail);
        log.setAction(premium ? "GRANT_PREMIUM" : "REVOKE_PREMIUM");
        log.setTargetUserId(target.getId());
        log.setTargetUserEmail(target.getEmail());
        log.setDetails((premium ? "Granted" : "Revoked") + " premium manually from admin dashboard");
        adminActionRepository.save(log);

        return true;
    }

    /** Recent admin actions, newest first. */
    public List<Map<String, Object>> getAuditLog(int limit) {
        return adminActionRepository.findAll().stream()
            .sorted(Comparator.comparing(AdminAction::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
            .limit(limit)
            .map(a -> {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("adminEmail", maskEmail(a.getAdminEmail()));
                row.put("action", a.getAction());
                row.put("targetEmail", maskEmail(a.getTargetUserEmail()));
                row.put("details", a.getDetails());
                row.put("createdAt", a.getCreatedAt());
                return row;
            })
            .collect(Collectors.toList());
    }

    /** Every article that scored below 40 - the false-claim cap catching misinformation. */
    public List<Map<String, Object>> getFlaggedContent(int limit) {
        return articleRepository.findAll().stream()
            .filter(a -> a.getOverallScore() != null && a.getOverallScore() < 40)
            .sorted(Comparator.comparing(Article::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
            .limit(limit)
            .map(a -> {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("title", a.getTitle());
                row.put("source", a.getSourceName());
                row.put("score", a.getOverallScore());
                row.put("verdict", a.getCredibilityVerdict());
                row.put("url", a.getUrl());
                row.put("createdAt", a.getCreatedAt());
                return row;
            })
            .collect(Collectors.toList());
    }

    /** Checks run per day, last 7 days (including days with zero). */
    public List<Map<String, Object>> getWeeklyTrend() {
        List<Article> articles = articleRepository.findAll();
        Map<LocalDate, Long> byDay = articles.stream()
            .filter(a -> a.getCreatedAt() != null)
            .collect(Collectors.groupingBy(a -> a.getCreatedAt().toLocalDate(), Collectors.counting()));

        List<Map<String, Object>> result = new ArrayList<>();
        LocalDate today = LocalDate.now();
        for (int i = 6; i >= 0; i--) {
            LocalDate day = today.minusDays(i);
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("date", day.toString());
            row.put("count", byDay.getOrDefault(day, 0L));
            result.add(row);
        }
        return result;
    }

    public Map<String, Object> getOverview() {
        List<User> users = userRepository.findAll();
        List<Article> articles = articleRepository.findAll();
        List<Payment> payments = paymentRepository.findAll();

        long premiumCount = users.stream().filter(User::isPremium).count();
        long successfulPayments = payments.stream().filter(p -> "SUCCESS".equals(p.getStatus())).count();
        long revenuePesewas = payments.stream()
            .filter(p -> "SUCCESS".equals(p.getStatus()))
            .mapToLong(Payment::getAmount)
            .sum();

        double avgScore = articles.stream()
            .filter(a -> a.getOverallScore() != null)
            .mapToDouble(Article::getOverallScore)
            .average().orElse(0);

        Map<String, Object> overview = new LinkedHashMap<>();
        overview.put("totalUsers", users.size());
        overview.put("premiumUsers", premiumCount);
        overview.put("freeUsers", users.size() - premiumCount);
        overview.put("totalAnalyses", articles.size());
        overview.put("averageScore", Math.round(avgScore * 10) / 10.0);
        overview.put("successfulPayments", successfulPayments);
        overview.put("revenueGhs", Math.round((revenuePesewas / 100.0) * 100) / 100.0);
        return overview;
    }

    public List<Map<String, Object>> getVerdictDistribution() {
        List<Article> articles = articleRepository.findAll();
        int total = articles.size();
        Map<String, Long> counts = articles.stream()
            .collect(Collectors.groupingBy(
                a -> a.getCredibilityVerdict() != null ? a.getCredibilityVerdict() : "UNRATED",
                Collectors.counting()));

        List<String> order = List.of("CREDIBLE", "LIKELY_CREDIBLE", "UNSURE", "MISLEADING", "NOT_CREDIBLE");
        List<Map<String, Object>> result = new ArrayList<>();
        for (String verdict : order) {
            long count = counts.getOrDefault(verdict, 0L);
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("verdict", verdict);
            row.put("count", count);
            row.put("percent", total == 0 ? 0 : Math.round((count * 1000.0) / total) / 10.0);
            result.add(row);
        }
        return result;
    }

    public List<Map<String, Object>> getSourceLeaderboard(int limit) {
        List<Article> articles = articleRepository.findAll();
        Map<String, List<Article>> bySource = articles.stream()
            .filter(a -> a.getSourceName() != null && !a.getSourceName().isBlank())
            .collect(Collectors.groupingBy(Article::getSourceName));

        return bySource.entrySet().stream()
            .map(e -> {
                double avg = e.getValue().stream()
                    .filter(a -> a.getOverallScore() != null)
                    .mapToDouble(Article::getOverallScore)
                    .average().orElse(0);
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("source", e.getKey());
                row.put("checks", e.getValue().size());
                row.put("averageScore", Math.round(avg * 10) / 10.0);
                return row;
            })
            .sorted((a, b) -> Integer.compare((int) b.get("checks"), (int) a.get("checks")))
            .limit(limit)
            .collect(Collectors.toList());
    }

    public Map<String, Object> getRecentActivity(int limit) {
        List<Map<String, Object>> recentArticles = articleRepository.findAll().stream()
            .sorted(Comparator.comparing(Article::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
            .limit(limit)
            .map(a -> {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("title", a.getTitle());
                row.put("source", a.getSourceName());
                row.put("score", a.getOverallScore());
                row.put("verdict", a.getCredibilityVerdict());
                row.put("createdAt", a.getCreatedAt());
                return row;
            })
            .collect(Collectors.toList());

        List<Map<String, Object>> recentUsers = userRepository.findAll().stream()
            .sorted(Comparator.comparing(User::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
            .limit(limit)
            .map(u -> {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("fullName", u.getFullName());
                row.put("premium", u.isPremium());
                row.put("createdAt", u.getCreatedAt());
                return row;
            })
            .collect(Collectors.toList());

        List<Map<String, Object>> recentPayments = paymentRepository.findAll().stream()
            .filter(p -> "SUCCESS".equals(p.getStatus()))
            .sorted(Comparator.comparing(Payment::getPaidAt, Comparator.nullsLast(Comparator.reverseOrder())))
            .limit(limit)
            .map(p -> {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("amountGhs", Math.round((p.getAmount() / 100.0) * 100) / 100.0);
                row.put("currency", p.getCurrency());
                row.put("paidAt", p.getPaidAt());
                return row;
            })
            .collect(Collectors.toList());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("articles", recentArticles);
        result.put("users", recentUsers);
        result.put("payments", recentPayments);
        return result;
    }
}
