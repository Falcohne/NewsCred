package com.NewsCred.backend.service;

import com.NewsCred.backend.entity.User;
import com.NewsCred.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

/**
 * Admin access is granted by email allowlist, not a one-off manual flag.
 *
 * Set ADMIN_EMAILS as a comma-separated list of teammate emails. Any user
 * who logs in with a matching email is automatically promoted to admin
 * (self-service - no one needs direct database access). Removing an email
 * from the list does NOT retroactively revoke access; that would need a
 * manual demotion, which is intentionally out of scope for a class project.
 */
@Service
public class AdminAccessService {

    private final UserRepository userRepository;
    private final Set<String> allowlist = new HashSet<>();

    public AdminAccessService(UserRepository userRepository,
                              @Value("${app.admin-emails:}") String adminEmails) {
        this.userRepository = userRepository;
        if (adminEmails != null && !adminEmails.isBlank()) {
            Arrays.stream(adminEmails.split(","))
                .map(String::trim)
                .map(String::toLowerCase)
                .filter(s -> !s.isEmpty())
                .forEach(allowlist::add);
        }
    }

    /** Call after successful login. Promotes the user if their email is allowlisted. */
    public void syncAdminStatus(User user) {
        if (user == null || user.getEmail() == null) return;
        boolean shouldBeAdmin = allowlist.contains(user.getEmail().toLowerCase().trim());
        if (shouldBeAdmin && !user.isAdmin()) {
            user.setAdmin(true);
            userRepository.save(user);
        }
    }
}
