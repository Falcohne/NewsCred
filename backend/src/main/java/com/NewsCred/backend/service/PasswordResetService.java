package com.NewsCred.backend.service;

import com.NewsCred.backend.entity.User;
import com.NewsCred.backend.entity.VerificationToken;
import com.NewsCred.backend.repository.UserRepository;
import com.NewsCred.backend.repository.VerificationTokenRepository;
import com.NewsCred.backend.util.PasswordValidator;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;

/**
 * Forgot-password flow:
 *  1. POST /auth/forgot-password {email} -> a 6-digit code is emailed
 *     (valid 15 minutes). The response is IDENTICAL whether or not the
 *     email exists, so attackers can't probe for registered accounts.
 *  2. POST /auth/reset-password {email, code, newPassword} -> verifies
 *     the code, applies the normal password rules, updates the password.
 */
@Service
public class PasswordResetService {

    private static final int CODE_MINUTES = 15;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final VerificationTokenRepository tokenRepository;
    private final PasswordValidator passwordValidator;
    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder(12);
    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String fromAddress;

    public PasswordResetService(UserRepository userRepository,
                                VerificationTokenRepository tokenRepository,
                                PasswordValidator passwordValidator,
                                JavaMailSender mailSender) {
        this.userRepository = userRepository;
        this.tokenRepository = tokenRepository;
        this.passwordValidator = passwordValidator;
        this.mailSender = mailSender;
    }

    public boolean isMailConfigured() {
        return fromAddress != null && !fromAddress.isEmpty();
    }

    @Transactional
    public void requestReset(String email) {
        User user = userRepository.findByEmail(email.toLowerCase().trim()).orElse(null);
        if (user == null) {
            return; // silently succeed - do not reveal whether the email exists
        }

        String code = String.format("%06d", RANDOM.nextInt(1_000_000));

        tokenRepository.deleteByUser_Id(user.getId());
        VerificationToken token = new VerificationToken(code, user);
        token.setExpiryDate(LocalDateTime.now().plusMinutes(CODE_MINUTES));
        tokenRepository.save(token);

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromAddress);
        message.setTo(user.getEmail());
        message.setSubject("Your NewsCred password reset code");
        message.setText(
            "Hi " + user.getFullName() + ",\n\n" +
            "Your password reset code is: " + code + "\n\n" +
            "It expires in " + CODE_MINUTES + " minutes. If you didn't request this, ignore this email.\n\n" +
            "— NewsCred");
        mailSender.send(message);
    }

    @Transactional
    public void resetPassword(String email, String code, String newPassword) {
        User user = userRepository.findByEmail(email.toLowerCase().trim())
            .orElseThrow(() -> new RuntimeException("Invalid code or email"));

        VerificationToken token = tokenRepository.findByToken(code).orElse(null);
        if (token == null || !token.getUser().getId().equals(user.getId()) || token.isExpired()) {
            throw new RuntimeException("Invalid or expired code. Request a new one.");
        }

        PasswordValidator.PasswordValidationResult result = passwordValidator.validate(newPassword);
        if (!result.isValid()) {
            throw new RuntimeException("Password requirements not met: " + result.getErrorMessage());
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        tokenRepository.deleteByUser_Id(user.getId());
    }
}
