package com.NewsCred.backend.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.UnsupportedJwtException;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SignatureException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

@Component
public class JwtUtil {

    /** HS256 needs a key of at least 256 bits (32 bytes) to be secure. */
    private static final int MIN_SECRET_BYTES = 32;

    private static final String CLAIM_TOKEN_VERSION = "tv";

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration}")
    private Long expiration;

    private static final long REFRESH_EXPIRATION = 604800000L;

    private Key signingKey;

    @PostConstruct
    public void validateAndBuildKey() {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException(
                "JWT_SECRET is not set. Set the JWT_SECRET environment variable to a " +
                "random string of at least 32 characters before starting the server.");
        }
        int secretBytes = secret.getBytes(StandardCharsets.UTF_8).length;
        if (secretBytes < MIN_SECRET_BYTES) {
            throw new IllegalStateException(
                "JWT_SECRET is too short (" + secretBytes + " bytes). It must be at least " +
                MIN_SECRET_BYTES + " bytes (32+ random characters) to safely sign HS256 tokens. " +
                "Generate a new one and set it as the JWT_SECRET environment variable.");
        }
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    public Date extractIssuedAt(String token) {
        return extractClaim(token, Claims::getIssuedAt);
    }

    /** Token version embedded at issue time; absent (pre-existing) tokens are treated as version 0. */
    public int extractTokenVersion(String token) {
        Object tv = extractClaim(token, claims -> claims.get(CLAIM_TOKEN_VERSION));
        if (tv == null) return 0;
        return ((Number) tv).intValue();
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    private Claims extractAllClaims(String token) {
        try {
            return Jwts.parserBuilder()
                    .setSigningKey(signingKey)
                    .build()
                    .parseClaimsJws(token)
                    .getBody();
        } catch (ExpiredJwtException e) {
            throw new RuntimeException("Token has expired");
        } catch (MalformedJwtException e) {
            throw new RuntimeException("Token is malformed");
        } catch (SignatureException e) {
            throw new RuntimeException("Token signature is invalid");
        } catch (UnsupportedJwtException e) {
            throw new RuntimeException("Token is unsupported");
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Token claims string is empty");
        }
    }

    private Boolean isTokenExpired(String token) {
        try {
            return extractExpiration(token).before(new Date());
        } catch (Exception e) {
            return true;
        }
    }

    public String generateToken(String username, int tokenVersion) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("created", new Date());
        claims.put(CLAIM_TOKEN_VERSION, tokenVersion);
        return createToken(claims, username, expiration);
    }

    public String generateRefreshToken(String username, int tokenVersion) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("created", new Date());
        claims.put("refresh", true);
        claims.put(CLAIM_TOKEN_VERSION, tokenVersion);
        return createToken(claims, username, REFRESH_EXPIRATION);
    }

    private String createToken(Map<String, Object> claims, String subject, Long expirationMillis) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expirationMillis);

        return Jwts.builder()
                .setClaims(claims)
                .setSubject(subject)
                .setIssuedAt(now)
                .setExpiration(expiryDate)
                .signWith(signingKey, SignatureAlgorithm.HS256)
                .compact();
    }

    public Boolean validateToken(String token, String username) {
        try {
            final String extractedUsername = extractUsername(token);
            return (extractedUsername.equals(username) && !isTokenExpired(token));
        } catch (Exception e) {
            return false;
        }
    }

    public Boolean validateToken(String token) {
        try {
            extractAllClaims(token);
            return !isTokenExpired(token);
        } catch (Exception e) {
            return false;
        }
    }

    public Boolean isTokenValid(String token) {
        try {
            return !isTokenExpired(token);
        } catch (Exception e) {
            return false;
        }
    }

    public Long getExpirationTime() {
        return expiration;
    }

    public Long getRefreshExpirationTime() {
        return REFRESH_EXPIRATION;
    }

    public Boolean isRefreshToken(String token) {
        try {
            Claims claims = extractAllClaims(token);
            return claims.get("refresh") != null && (Boolean) claims.get("refresh");
        } catch (Exception e) {
            return false;
        }
    }

    public long getTokenRemainingTime(String token) {
        try {
            Date expiration = extractExpiration(token);
            Date now = new Date();
            return expiration.getTime() - now.getTime();
        } catch (Exception e) {
            return 0;
        }
    }
}
