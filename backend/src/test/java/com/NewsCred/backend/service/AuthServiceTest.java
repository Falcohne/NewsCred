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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private ArticleRepository articleRepository;
    @Mock private VerificationTokenRepository verificationTokenRepository;
    @Mock private JwtUtil jwtUtil;
    @Mock private PasswordValidator passwordValidator;
    @Mock private AdminAccessService adminAccessService;

    // Matches AuthService's own internally-constructed encoder (BCryptPasswordEncoder(12)),
    // used here only to prepare realistic fixture password hashes.
    private final BCryptPasswordEncoder fixtureEncoder = new BCryptPasswordEncoder(12);

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(userRepository, articleRepository, verificationTokenRepository,
            jwtUtil, passwordValidator, adminAccessService);
    }

    private User buildUser(String email, String rawPassword, int tokenVersion) {
        User user = new User();
        user.setId("user-1");
        user.setEmail(email);
        user.setPassword(fixtureEncoder.encode(rawPassword));
        user.setFullName("Test User");
        user.setTokenVersion(tokenVersion);
        return user;
    }

    // ---------- register ----------

    @Test
    void registerCreatesUserAndReturnsTokens() {
        AuthRequest request = new AuthRequest();
        request.setEmail("new@example.com");
        request.setPassword("Str0ng!Passw0rd");
        request.setFullName("New User");
        request.setUsername("newuser");

        when(userRepository.existsByEmail("new@example.com")).thenReturn(false);
        when(userRepository.existsByUsername("newuser")).thenReturn(false);
        when(passwordValidator.validate("Str0ng!Passw0rd"))
            .thenReturn(new PasswordValidator.PasswordValidationResult(true, java.util.List.of()));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId("new-id");
            return u;
        });
        when(jwtUtil.generateToken("new@example.com", 0)).thenReturn("access-token");
        when(jwtUtil.generateRefreshToken("new@example.com", 0)).thenReturn("refresh-token");

        AuthResponse response = authService.register(request);

        assertEquals("access-token", response.getToken());
        assertEquals("refresh-token", response.getRefreshToken());
        assertEquals("new-id", response.getUserId());
        verify(userRepository).save(any(User.class));
    }

    @Test
    void registerRejectsDuplicateEmail() {
        AuthRequest request = new AuthRequest();
        request.setEmail("dup@example.com");
        request.setPassword("Str0ng!Passw0rd");
        request.setFullName("Dup User");

        when(userRepository.existsByEmail("dup@example.com")).thenReturn(true);

        assertThrows(RuntimeException.class, () -> authService.register(request));
        verify(userRepository, never()).save(any());
    }

    @Test
    void registerRejectsWeakPassword() {
        AuthRequest request = new AuthRequest();
        request.setEmail("weak@example.com");
        request.setPassword("weak");
        request.setFullName("Weak User");

        when(userRepository.existsByEmail("weak@example.com")).thenReturn(false);
        when(passwordValidator.validate("weak"))
            .thenReturn(new PasswordValidator.PasswordValidationResult(false, java.util.List.of("Too short")));

        RuntimeException ex = assertThrows(RuntimeException.class, () -> authService.register(request));
        assertTrue(ex.getMessage().contains("Password requirements not met"));
        verify(userRepository, never()).save(any());
    }

    // ---------- login ----------

    @Test
    void loginWithWrongPasswordFailsAndReportsRemainingAttempts() {
        User user = buildUser("alice@example.com", "correct-Passw0rd!", 0);
        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(user));

        LoginRequest request = new LoginRequest();
        request.setUsernameOrEmail("alice@example.com");
        request.setPassword("wrong-password");

        RuntimeException ex = assertThrows(RuntimeException.class, () -> authService.login(request));
        assertTrue(ex.getMessage().contains("Invalid password"));
        assertTrue(ex.getMessage().contains("4 attempts remaining"));
    }

    @Test
    void loginLocksAccountAfterFiveFailedAttempts() {
        User user = buildUser("bob@example.com", "correct-Passw0rd!", 0);
        when(userRepository.findByEmail("bob@example.com")).thenReturn(Optional.of(user));

        LoginRequest request = new LoginRequest();
        request.setUsernameOrEmail("bob@example.com");
        request.setPassword("wrong-password");

        for (int i = 0; i < 5; i++) {
            assertThrows(RuntimeException.class, () -> authService.login(request));
        }

        // 6th attempt (even if the password were now correct) should be blocked by the lockout.
        RuntimeException locked = assertThrows(RuntimeException.class, () -> authService.login(request));
        assertTrue(locked.getMessage().toLowerCase().contains("locked"));
    }

    @Test
    void loginSucceedsAndSyncsAdminStatusIntoResponse() {
        User user = buildUser("carol@example.com", "correct-Passw0rd!", 2);
        when(userRepository.findByEmail("carol@example.com")).thenReturn(Optional.of(user));
        doAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setAdmin(true);
            return null;
        }).when(adminAccessService).syncAdminStatus(user);
        when(jwtUtil.generateToken("carol@example.com", 2)).thenReturn("access-token");
        when(jwtUtil.generateRefreshToken("carol@example.com", 2)).thenReturn("refresh-token");

        LoginRequest request = new LoginRequest();
        request.setUsernameOrEmail("carol@example.com");
        request.setPassword("correct-Passw0rd!");

        AuthResponse response = authService.login(request);

        assertEquals("access-token", response.getToken());
        assertTrue(response.isAdmin());
        verify(adminAccessService).syncAdminStatus(user);
    }

    // ---------- refreshToken ----------

    @Test
    void refreshTokenIssuesNewTokensWhenVersionMatches() {
        User user = buildUser("dave@example.com", "irrelevant-Passw0rd!", 3);
        when(jwtUtil.validateToken("refresh-in")).thenReturn(true);
        when(jwtUtil.isRefreshToken("refresh-in")).thenReturn(true);
        when(jwtUtil.extractUsername("refresh-in")).thenReturn("dave@example.com");
        when(userRepository.findByEmail("dave@example.com")).thenReturn(Optional.of(user));
        when(jwtUtil.extractTokenVersion("refresh-in")).thenReturn(3);
        when(jwtUtil.generateToken("dave@example.com", 3)).thenReturn("new-access");
        when(jwtUtil.generateRefreshToken("dave@example.com", 3)).thenReturn("new-refresh");

        AuthResponse response = authService.refreshToken("refresh-in");

        assertEquals("new-access", response.getToken());
        assertEquals("new-refresh", response.getRefreshToken());
    }

    @Test
    void refreshTokenIsRejectedWhenVersionWasRevoked() {
        User user = buildUser("erin@example.com", "irrelevant-Passw0rd!", 5); // current version 5
        when(jwtUtil.validateToken("stale-refresh")).thenReturn(true);
        when(jwtUtil.isRefreshToken("stale-refresh")).thenReturn(true);
        when(jwtUtil.extractUsername("stale-refresh")).thenReturn("erin@example.com");
        when(userRepository.findByEmail("erin@example.com")).thenReturn(Optional.of(user));
        when(jwtUtil.extractTokenVersion("stale-refresh")).thenReturn(4); // token issued before logout-everywhere

        RuntimeException ex = assertThrows(RuntimeException.class,
            () -> authService.refreshToken("stale-refresh"));
        assertTrue(ex.getMessage().toLowerCase().contains("revoked"));
        verify(jwtUtil, never()).generateToken(any(), anyInt());
    }

    @Test
    void refreshTokenRejectsInvalidSignatureOrExpiry() {
        when(jwtUtil.validateToken("garbage")).thenReturn(false);

        assertThrows(RuntimeException.class, () -> authService.refreshToken("garbage"));
        verifyNoInteractions(userRepository);
    }

    @Test
    void refreshTokenRejectsAnAccessTokenUsedAsRefresh() {
        when(jwtUtil.validateToken("access-token")).thenReturn(true);
        when(jwtUtil.isRefreshToken("access-token")).thenReturn(false);

        RuntimeException ex = assertThrows(RuntimeException.class,
            () -> authService.refreshToken("access-token"));
        assertTrue(ex.getMessage().contains("Invalid token type"));
    }

    // ---------- changePassword ----------

    @Test
    void changePasswordBumpsTokenVersionToRevokeOldSessions() {
        User user = buildUser("frank@example.com", "old-Passw0rd!", 0);
        when(userRepository.findById("user-1")).thenReturn(Optional.of(user));
        when(passwordValidator.validate("new-Passw0rd!"))
            .thenReturn(new PasswordValidator.PasswordValidationResult(true, java.util.List.of()));

        authService.changePassword("user-1", "old-Passw0rd!", "new-Passw0rd!");

        assertEquals(1, user.getTokenVersion());
        verify(userRepository).save(user);
    }

    @Test
    void changePasswordRejectsWrongCurrentPassword() {
        User user = buildUser("gail@example.com", "old-Passw0rd!", 0);
        when(userRepository.findById("user-1")).thenReturn(Optional.of(user));

        assertThrows(RuntimeException.class,
            () -> authService.changePassword("user-1", "totally-wrong", "new-Passw0rd!"));
        assertEquals(0, user.getTokenVersion());
    }

    @Test
    void changePasswordRejectsSameNewPassword() {
        User user = buildUser("hank@example.com", "same-Passw0rd!", 0);
        when(userRepository.findById("user-1")).thenReturn(Optional.of(user));
        when(passwordValidator.validate("same-Passw0rd!"))
            .thenReturn(new PasswordValidator.PasswordValidationResult(true, java.util.List.of()));

        RuntimeException ex = assertThrows(RuntimeException.class,
            () -> authService.changePassword("user-1", "same-Passw0rd!", "same-Passw0rd!"));
        assertTrue(ex.getMessage().contains("must be different"));
    }

    // ---------- logoutEverywhere ----------

    @Test
    void logoutEverywhereIncrementsTokenVersion() {
        User user = buildUser("iris@example.com", "irrelevant-Passw0rd!", 5);
        when(userRepository.findById("user-1")).thenReturn(Optional.of(user));

        authService.logoutEverywhere("user-1");

        assertEquals(6, user.getTokenVersion());
        verify(userRepository).save(user);
    }

    @Test
    void logoutEverywhereThrowsForUnknownUser() {
        when(userRepository.findById("missing")).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> authService.logoutEverywhere("missing"));
    }
}
