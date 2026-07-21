package com.NewsCred.backend.dto;

public class AuthResponse {
    private String token;
    private String refreshToken;
    private String userId;
    private String email;
    private String fullName;
    private boolean premium;
    private int analysisCount;
    private boolean emailSent;

    public AuthResponse(String token, String userId, String email, String fullName, boolean premium, int analysisCount) {
        this.token = token;
        this.userId = userId;
        this.email = email;
        this.fullName = fullName;
        this.premium = premium;
        this.analysisCount = analysisCount;
        this.emailSent = false;
    }

    public AuthResponse(String token, String refreshToken, String userId, String email, String fullName, boolean premium, int analysisCount) {
        this.token = token;
        this.refreshToken = refreshToken;
        this.userId = userId;
        this.email = email;
        this.fullName = fullName;
        this.premium = premium;
        this.analysisCount = analysisCount;
        this.emailSent = false;
    }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }

    public String getRefreshToken() { return refreshToken; }
    public void setRefreshToken(String refreshToken) { this.refreshToken = refreshToken; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public boolean isPremium() { return premium; }
    public void setPremium(boolean premium) { this.premium = premium; }

    public int getAnalysisCount() { return analysisCount; }
    public void setAnalysisCount(int analysisCount) { this.analysisCount = analysisCount; }

    public boolean isEmailSent() { return emailSent; }
    public void setEmailSent(boolean emailSent) { this.emailSent = emailSent; }
}