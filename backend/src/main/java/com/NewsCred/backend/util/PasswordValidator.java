package com.NewsCred.backend.util;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Component
public class PasswordValidator {

    private static final int MIN_LENGTH = 8;
    private static final int MAX_LENGTH = 64;
    private static final Set<String> COMMON_PASSWORDS = new HashSet<>();

    static {
        COMMON_PASSWORDS.addAll(List.of(
            "password", "12345678", "qwertyuiop", "admin123", "letmein",
            "welcome1", "password1", "123456789", "abcdefgh", "1234567890",
            "qwerty123", "passw0rd", "adminadmin", "letmein123"
        ));
    }

    public PasswordValidationResult validate(String password) {
        List<String> errors = new ArrayList<>();

        if (password == null || password.isEmpty()) {
            errors.add("Password is required");
            return new PasswordValidationResult(false, errors);
        }

        if (password.length() < MIN_LENGTH) {
            errors.add("Password must be at least " + MIN_LENGTH + " characters long");
        }

        if (password.length() > MAX_LENGTH) {
            errors.add("Password must be less than " + MAX_LENGTH + " characters");
        }

        if (!password.matches(".*[A-Z].*")) {
            errors.add("Password must contain at least 1 uppercase letter");
        }

        if (!password.matches(".*[a-z].*")) {
            errors.add("Password must contain at least 1 lowercase letter");
        }

        if (!password.matches(".*\\d.*")) {
            errors.add("Password must contain at least 1 number");
        }

        if (!password.matches(".*[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>/?].*")) {
            errors.add("Password must contain at least 1 special character");
        }

        String lowerPassword = password.toLowerCase();
        if (lowerPassword.contains("password")) {
            errors.add("Password cannot contain the word 'password'");
        }
        
        String[] commonPatterns = {"123456", "qwerty", "abcdef", "admin", "letme", "welcome"};
        for (String pattern : commonPatterns) {
            if (lowerPassword.contains(pattern)) {
                errors.add("Password contains common pattern '" + pattern + "'");
                break;
            }
        }

        if (password.matches(".*(.)\\1{3,}.*")) {
            errors.add("Password contains too many repeated characters");
        }

        if (isSequential(password)) {
            errors.add("Password contains sequential characters");
        }

        if (COMMON_PASSWORDS.contains(lowerPassword)) {
            errors.add("Password is too common and easily guessable");
        }

        int score = calculateStrengthScore(password);
        boolean isStrong = errors.isEmpty() && score >= 60;

        return new PasswordValidationResult(errors.isEmpty(), errors, score, isStrong);
    }

    private boolean isSequential(String password) {
        String lower = password.toLowerCase();
        String[] sequences = {
            "abcdefghijklmnopqrstuvwxyz",
            "qwertyuiopasdfghjklzxcvbnm",
            "1234567890"
        };
        
        for (String seq : sequences) {
            for (int i = 0; i < seq.length() - 3; i++) {
                String sub = seq.substring(i, i + 4);
                if (lower.contains(sub)) {
                    return true;
                }
            }
        }
        return false;
    }

    private int calculateStrengthScore(String password) {
        int score = 0;
        
        if (password.length() >= 12) score += 20;
        else if (password.length() >= 10) score += 15;
        else if (password.length() >= 8) score += 10;
        
        if (password.matches(".*[A-Z].*")) score += 15;
        if (password.matches(".*[a-z].*")) score += 10;
        if (password.matches(".*\\d.*")) score += 10;
        if (password.matches(".*[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>/?].*")) score += 15;
        
        if (password.length() > 12) score += 5;
        if (password.matches(".*[A-Z].*[A-Z].*")) score += 5;
        if (password.matches(".*\\d.*\\d.*")) score += 5;
        
        return Math.min(score, 100);
    }

    public static class PasswordValidationResult {
        private final boolean valid;
        private final List<String> errors;
        private final int strengthScore;
        private final boolean isStrong;

        public PasswordValidationResult(boolean valid, List<String> errors) {
            this(valid, errors, 0, false);
        }

        public PasswordValidationResult(boolean valid, List<String> errors, int strengthScore, boolean isStrong) {
            this.valid = valid;
            this.errors = errors;
            this.strengthScore = strengthScore;
            this.isStrong = isStrong;
        }

        public boolean isValid() { return valid; }
        public List<String> getErrors() { return errors; }
        public int getStrengthScore() { return strengthScore; }
        public boolean isStrong() { return isStrong; }
        
        public String getErrorMessage() {
            if (errors.isEmpty()) return "Password is valid";
            return String.join("\n", errors);
        }

        public String getStrengthLabel() {
            if (strengthScore >= 80) return "Strong";
            if (strengthScore >= 60) return "Good";
            if (strengthScore >= 40) return "Weak";
            return "Very Weak";
        }
    }
}