package com.NewsCred.backend.util;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

class JwtUtilTest {

    private static final String VALID_SECRET = "this-is-a-valid-32-plus-byte-test-secret";

    private JwtUtil jwtUtil;

    @BeforeEach
    void setUp() {
        jwtUtil = new JwtUtil();
        ReflectionTestUtils.setField(jwtUtil, "secret", VALID_SECRET);
        ReflectionTestUtils.setField(jwtUtil, "expiration", 3600000L);
        jwtUtil.validateAndBuildKey();
    }

    @Test
    void rejectsNullSecretAtStartup() {
        JwtUtil util = new JwtUtil();
        ReflectionTestUtils.setField(util, "secret", null);
        ReflectionTestUtils.setField(util, "expiration", 3600000L);
        assertThrows(IllegalStateException.class, util::validateAndBuildKey);
    }

    @Test
    void rejectsBlankSecretAtStartup() {
        JwtUtil util = new JwtUtil();
        ReflectionTestUtils.setField(util, "secret", "   ");
        ReflectionTestUtils.setField(util, "expiration", 3600000L);
        assertThrows(IllegalStateException.class, util::validateAndBuildKey);
    }

    @Test
    void rejectsSecretShorterThan32BytesAtStartup() {
        JwtUtil util = new JwtUtil();
        ReflectionTestUtils.setField(util, "secret", "too-short");
        ReflectionTestUtils.setField(util, "expiration", 3600000L);
        IllegalStateException ex = assertThrows(IllegalStateException.class, util::validateAndBuildKey);
        assertTrue(ex.getMessage().contains("too short"));
    }

    @Test
    void acceptsSecretOfExactly32Bytes() {
        JwtUtil util = new JwtUtil();
        ReflectionTestUtils.setField(util, "secret", "12345678901234567890123456789012"); // 32 chars
        ReflectionTestUtils.setField(util, "expiration", 3600000L);
        assertDoesNotThrow(util::validateAndBuildKey);
    }

    @Test
    void generatedAccessTokenRoundTripsUsernameAndVersion() {
        String token = jwtUtil.generateToken("alice@example.com", 3);

        assertEquals("alice@example.com", jwtUtil.extractUsername(token));
        assertEquals(3, jwtUtil.extractTokenVersion(token));
        assertFalse(jwtUtil.isRefreshToken(token));
        assertTrue(jwtUtil.validateToken(token, "alice@example.com"));
        assertTrue(jwtUtil.validateToken(token));
    }

    @Test
    void generatedRefreshTokenIsMarkedAsRefresh() {
        String refreshToken = jwtUtil.generateRefreshToken("bob@example.com", 0);

        assertTrue(jwtUtil.isRefreshToken(refreshToken));
        assertEquals("bob@example.com", jwtUtil.extractUsername(refreshToken));
    }

    @Test
    void validateTokenFailsForWrongUsername() {
        String token = jwtUtil.generateToken("alice@example.com", 0);
        assertFalse(jwtUtil.validateToken(token, "someone-else@example.com"));
    }

    @Test
    void validateTokenFailsForGarbageInput() {
        assertFalse(jwtUtil.validateToken("not-a-real-jwt"));
    }

    @Test
    void expiredTokenFailsValidation() {
        ReflectionTestUtils.setField(jwtUtil, "expiration", -1000L); // already expired the instant it's issued
        String expiredToken = jwtUtil.generateToken("alice@example.com", 0);
        assertFalse(jwtUtil.validateToken(expiredToken));
        assertFalse(jwtUtil.validateToken(expiredToken, "alice@example.com"));
    }

    @Test
    void tokenSignedWithDifferentSecretIsRejected() {
        String token = jwtUtil.generateToken("alice@example.com", 0);

        JwtUtil otherUtil = new JwtUtil();
        ReflectionTestUtils.setField(otherUtil, "secret", "a-completely-different-32-byte-secret!!");
        ReflectionTestUtils.setField(otherUtil, "expiration", 3600000L);
        otherUtil.validateAndBuildKey();

        assertFalse(otherUtil.validateToken(token));
    }

    @Test
    void tokenWithoutVersionClaimDefaultsToZero() {
        // Simulate a pre-existing token minted before tokenVersion existed.
        String token = io.jsonwebtoken.Jwts.builder()
            .setSubject("legacy@example.com")
            .setIssuedAt(new java.util.Date())
            .setExpiration(new java.util.Date(System.currentTimeMillis() + 60000))
            .signWith((java.security.Key) ReflectionTestUtils.getField(jwtUtil, "signingKey"),
                io.jsonwebtoken.SignatureAlgorithm.HS256)
            .compact();

        assertEquals(0, jwtUtil.extractTokenVersion(token));
    }
}
