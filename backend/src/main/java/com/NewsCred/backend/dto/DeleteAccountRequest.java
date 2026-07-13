package com.NewsCred.backend.dto;

import javax.validation.constraints.NotBlank;

public class DeleteAccountRequest {
    
    @NotBlank(message = "Password is required to confirm account deletion")
    private String password;

    @NotBlank(message = "Confirmation is required")
    private String confirmation;  // Should be "DELETE"

    // Getters and Setters
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getConfirmation() { return confirmation; }
    public void setConfirmation(String confirmation) { this.confirmation = confirmation; }
}