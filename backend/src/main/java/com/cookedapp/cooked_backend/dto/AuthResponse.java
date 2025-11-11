package com.cookedapp.cooked_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AuthResponse {
    // We will add the JWT token here later
    // private String token;
    private String message; // Simple success message for now
    private String username; // Optionally return username or other user info
}