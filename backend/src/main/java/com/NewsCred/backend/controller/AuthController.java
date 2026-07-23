package com.NewsCred.backend.controller;

import com.NewsCred.backend.dto.AuthRequest;
import com.NewsCred.backend.dto.AuthResponse;
import com.NewsCred.backend.dto.DeleteAccountRequest;
import com.NewsCred.backend.dto.ErrorResponse;
import com.NewsCred.backend.dto.LoginRequest;
import com.NewsCred.backend.dto.PasswordChangeRequest;
import com.NewsCred.backend.dto.UpdateUserRequest;
import com.NewsCred.backend.entity.User;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import com.NewsCred.backend.service.AuthService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class AuthController {

    private final AuthService authService;
    private final com.NewsCred.backend.service.PasswordResetService passwordResetService;

    public AuthController(AuthService authService,
                          com.NewsCred.backend.service.PasswordResetService passwordResetService) {
        this.authService = authService;
        this.passwordResetService = passwordResetService;
    }

    @PostMapping("/auth/register")
    public ResponseEntity<?> register(@Valid @RequestBody AuthRequest request) {
        try {
            AuthResponse response = authService.register(request);
            
            Map<String, Object> result = new HashMap<>();
            result.put("response", response);
            result.put("message", "Registration successful. You can now login.");
            result.put("success", true);
            
            return ResponseEntity.status(HttpStatus.CREATED).body(result);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                .body(ErrorResponse.of("VALIDATION_ERROR", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                .body(ErrorResponse.of("REGISTRATION_ERROR", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ErrorResponse.of("SERVER_ERROR", "Registration failed: " + e.getMessage()));
        }
    }

    @PostMapping("/auth/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        try {
            AuthResponse response = authService.login(request);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                .body(ErrorResponse.of("VALIDATION_ERROR", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ErrorResponse.of("AUTH_ERROR", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ErrorResponse.of("SERVER_ERROR", "Login failed: " + e.getMessage()));
        }
    }

    @PostMapping("/auth/refresh")
    public ResponseEntity<?> refreshToken(@RequestBody Map<String, String> request) {
        try {
            String refreshToken = request.get("refreshToken");
            if (refreshToken == null || refreshToken.isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(ErrorResponse.of("VALIDATION_ERROR", "Refresh token is required"));
            }
            
            AuthResponse response = authService.refreshToken(refreshToken);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ErrorResponse.of("TOKEN_ERROR", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ErrorResponse.of("SERVER_ERROR", "Token refresh failed: " + e.getMessage()));
        }
    }

    @PostMapping("/auth/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> request) {
        try {
            String email = request.get("email");
            if (email == null || email.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(ErrorResponse.of("VALIDATION_ERROR", "Email is required"));
            }
            if (!passwordResetService.isMailConfigured()) {
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(ErrorResponse.of("MAIL_NOT_CONFIGURED",
                        "Password reset email is not configured on this server."));
            }
            passwordResetService.requestReset(email);
            Map<String, String> response = new HashMap<>();
            response.put("message", "If that email is registered, a reset code has been sent.");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ErrorResponse.of("SERVER_ERROR", "Could not send reset code: " + e.getMessage()));
        }
    }

    @PostMapping("/auth/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> request) {
        try {
            String email = request.get("email");
            String code = request.get("code");
            String newPassword = request.get("newPassword");
            if (email == null || code == null || newPassword == null) {
                return ResponseEntity.badRequest()
                    .body(ErrorResponse.of("VALIDATION_ERROR", "Email, code, and new password are required"));
            }
            passwordResetService.resetPassword(email, code, newPassword);
            Map<String, String> response = new HashMap<>();
            response.put("message", "Password reset. You can now sign in with the new password.");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                .body(ErrorResponse.of("RESET_ERROR", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ErrorResponse.of("SERVER_ERROR", "Reset failed: " + e.getMessage()));
        }
    }

    @PutMapping("/users/{userId}/password")
    public ResponseEntity<?> changePassword(
            @AuthenticationPrincipal User currentUser,
            @PathVariable String userId,
            @Valid @RequestBody PasswordChangeRequest request) {
        try {
        if (currentUser == null || !currentUser.getId().equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ErrorResponse.of("FORBIDDEN", "You can only manage your own account"));
        }
            authService.changePassword(userId, request.getCurrentPassword(), request.getNewPassword());
            
            Map<String, String> response = new HashMap<>();
            response.put("message", "Password changed successfully");
            response.put("success", "true");
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                .body(ErrorResponse.of("VALIDATION_ERROR", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                .body(ErrorResponse.of("PASSWORD_ERROR", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ErrorResponse.of("SERVER_ERROR", "Failed to change password: " + e.getMessage()));
        }
    }

    @PutMapping("/users/{userId}")
    public ResponseEntity<?> updateUserProfile(
            @AuthenticationPrincipal User currentUser,
            @PathVariable String userId,
            @Valid @RequestBody UpdateUserRequest request) {
        try {
        if (currentUser == null || !currentUser.getId().equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ErrorResponse.of("FORBIDDEN", "You can only manage your own account"));
        }
            User updatedUser = authService.updateUserProfile(userId, request.getFullName());
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Profile updated successfully");
            response.put("success", true);
            response.put("userId", updatedUser.getId());
            response.put("fullName", updatedUser.getFullName());
            response.put("email", updatedUser.getEmail());
            response.put("username", updatedUser.getUsername());
            response.put("premium", updatedUser.isPremium());
            response.put("analysisCount", updatedUser.getAnalysisCount());
            
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                .body(ErrorResponse.of("VALIDATION_ERROR", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                .body(ErrorResponse.of("PROFILE_ERROR", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ErrorResponse.of("SERVER_ERROR", "Failed to update profile: " + e.getMessage()));
        }
    }

    @GetMapping("/users/{userId}")
    public ResponseEntity<?> getUser(@AuthenticationPrincipal User currentUser,
            @PathVariable String userId) {
        try {
        if (currentUser == null || !currentUser.getId().equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ErrorResponse.of("FORBIDDEN", "You can only manage your own account"));
        }
            User user = authService.getUserById(userId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("id", user.getId());
            response.put("email", user.getEmail());
            response.put("fullName", user.getFullName());
            response.put("username", user.getUsername());
            response.put("premium", user.isPremium());
            response.put("analysisCount", user.getAnalysisCount());
            
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ErrorResponse.of("NOT_FOUND", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ErrorResponse.of("SERVER_ERROR", "Failed to get user: " + e.getMessage()));
        }
    }

    @DeleteMapping("/users/{userId}")
    public ResponseEntity<?> deleteAccount(
            @AuthenticationPrincipal User currentUser,
            @PathVariable String userId,
            @Valid @RequestBody DeleteAccountRequest request) {
        try {
        if (currentUser == null || !currentUser.getId().equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ErrorResponse.of("FORBIDDEN", "You can only manage your own account"));
        }
            authService.deleteAccount(userId, request.getPassword(), request.getConfirmation());
            
            Map<String, String> response = new HashMap<>();
            response.put("message", "Account deleted successfully");
            response.put("success", "true");
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                .body(ErrorResponse.of("VALIDATION_ERROR", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                .body(ErrorResponse.of("DELETE_ERROR", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ErrorResponse.of("SERVER_ERROR", "Failed to delete account: " + e.getMessage()));
        }
    }
}