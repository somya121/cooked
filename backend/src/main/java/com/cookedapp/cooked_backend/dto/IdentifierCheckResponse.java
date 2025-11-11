package com.cookedapp.cooked_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class IdentifierCheckResponse {
    private boolean userExists; // True if the user exists, false otherwise
    private String identifier;  // Echo back the identifier checked
}