package com.NewsCred.backend.service;

import com.NewsCred.backend.dto.AuthRequest;
import com.NewsCred.backend.dto.AuthResponse;
import com.NewsCred.backend.dto.LoginRequest;
import com.NewsCred.backend.entity.User;
import com.NewsCred.backend.repository.ArticleRepository;
import com.NewsCred.backend.repository.UserRepository;
import com.NewsCred.backend.repository.VerificationTokenRepository;
import com.NewsCred.backend.util.JwtUtil;
import com.NewsCred.backend.util.PasswordValidator;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final ArticleRepository articleRepository;
    private final VerificationTokenRepository verificationTokenRepository;
    private final JwtUtil jwtUtil;
    private final PasswordEncoder passwordEncoder;
    private final PasswordValidator passwordValidator;

    private final ConcurrentHashMap<String, Integer> loginAttempts = new ConcurrentHashMap<>();
    private static final int MAX_LOGIN_ATTEMPTS = 5;
    private static final long LOCKOUT_DURATION_MINUTES = 15;

    public AuthService(UserRepository userRepository,
                       ArticleRepository articleRepository,
                       VerificationTokenRepository verificationTokenRepository,
                       JwtUtil jwtUtil,
                       PasswordValidator passwordValidator) {
        this.userRepository = userRepository;
        this.articleRepository = articleRepository;
        this.verificationTokenRepository = verificationTokenRepository;
        this.jwtUtil = jwtUtil;
        this.passwordEncoder = new BCryptPasswordEncoder(12);
        this.passwordValidator = passwordValidator;
    }

    public AuthResponse register(AuthRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already registered");
        }

        if (request.getUsername() != null && !request.getUsername().isEmpty()) {
            if (userRepository.existsByUsername(request.getUsername())) {
                throw new RuntimeException("Username already taken");
            }
        }

        PasswordValidator.PasswordValidationResult validationResult = 
            passwordValidator.validate(request.getPassword());
        if (!validationResult.isValid()) {
            throw new RuntimeException("Password requirements not met: " + 
                validationResult.getErrorMessage());
        }

        User user = new User();
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setFullName(request.getFullName());
        user.setUsername(request.getUsername());
        user.setEmailVerified(true);
        user.setCreatedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());

        user = userRepository.save(user);

        String token = jwtUtil.generateToken(user.getEmail());
        String refreshToken = jwtUtil.generateRefreshToken(user.getEmail());

        AuthResponse response = new AuthResponse(
            token,
            user.getId(),
            user.getEmail(),
            user.getFullName(),
            user.isPremium(),
            user.getAnalysisCount()
        );
        // Remove this line if AuthResponse doesn't have setRefreshToken
        // response.setRefreshToken(refreshToken);
        
        return response;
    }

    public AuthResponse login(LoginRequest request) {
        String email = request.getEmail().toLowerCase();
        
        if (isAccountLocked(email)) {
            long remainingMinutes = getRemainingLockoutMinutes(email);
            throw new RuntimeException("Account is temporarily locked. Please try again in " + 
                remainingMinutes + " minutes.");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            recordFailedAttempt(email);
            int remainingAttempts = MAX_LOGIN_ATTEMPTS - loginAttempts.getOrDefault(email, 0);
            throw new RuntimeException("Invalid password. " + remainingAttempts + " attempts remaining.");
        }

        loginAttempts.remove(email);

        String token = jwtUtil.generateToken(user.getEmail());
        String refreshToken = jwtUtil.generateRefreshToken(user.getEmail());

        AuthResponse response = new AuthResponse(
            token,
            user.getId(),
            user.getEmail(),
            user.getFullName(),
            user.isPremium(),
            user.getAnalysisCount()
        );
        // Remove this line if AuthResponse doesn't have setRefreshToken
        // response.setRefreshToken(refreshToken);
        
        return response;
    }

    public AuthResponse refreshToken(String refreshToken) {
        if (!jwtUtil.validateToken(refreshToken)) {
            throw new RuntimeException("Invalid refresh token");
        }

        if (!jwtUtil.isRefreshToken(refreshToken)) {
            throw new RuntimeException("Invalid token type");
        }

        String username = jwtUtil.extractUsername(refreshToken);
        User user = userRepository.findByEmail(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        String newToken = jwtUtil.generateToken(user.getEmail());
        String newRefreshToken = jwtUtil.generateRefreshToken(user.getEmail());

        AuthResponse response = new AuthResponse(
            newToken,
            user.getId(),
            user.getEmail(),
            user.getFullName(),
            user.isPremium(),
            user.getAnalysisCount()
        );
        // Remove this line if AuthResponse doesn't have setRefreshToken
        // response.setRefreshToken(newRefreshToken);
        
        return response;
    }

    @Transactional
    public void changePassword(String userId, String currentPassword, String newPassword) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new RuntimeException("Current password is incorrect");
        }

        PasswordValidator.PasswordValidationResult validationResult = 
            passwordValidator.validate(newPassword);
        if (!validationResult.isValid()) {
            throw new RuntimeException("Password requirements not met: " + 
                validationResult.getErrorMessage());
        }

        if (passwordEncoder.matches(newPassword, user.getPassword())) {
            throw new RuntimeException("New password must be different from current password");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);
    }

    @Transactional
    public User updateUserProfile(String userId, String fullName) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (fullName == null || fullName.trim().isEmpty()) {
            throw new RuntimeException("Full name cannot be empty");
        }

        if (fullName.trim().length() < 2) {
            throw new RuntimeException("Full name must be at least 2 characters long");
        }

        user.setFullName(fullName.trim());
        user.setUpdatedAt(LocalDateTime.now());
        return userRepository.save(user);
    }

    public User getUserById(String userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    public boolean userExistsByEmail(String email) {
        return userRepository.existsByEmail(email);
    }

    @Transactional
    public void deleteAccount(String userId, String password, String confirmation) {
        if (!"DELETE".equals(confirmation)) {
            throw new RuntimeException("Please type 'DELETE' to confirm account deletion");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new RuntimeException("Incorrect password");
        }

        articleRepository.deleteByUserId(userId);
        verificationTokenRepository.deleteByUser_Id(userId);
        userRepository.delete(user);
    }

    private boolean isAccountLocked(String email) {
        Integer attempts = loginAttempts.get(email);
        if (attempts == null || attempts < MAX_LOGIN_ATTEMPTS) {
            return false;
        }
        return true;
    }

    private long getRemainingLockoutMinutes(String email) {
        return LOCKOUT_DURATION_MINUTES;
    }

    private void recordFailedAttempt(String email) {
        loginAttempts.compute(email, (key, value) -> {
            if (value == null) return 1;
            return Math.min(value + 1, MAX_LOGIN_ATTEMPTS + 1);
        });
    }
}