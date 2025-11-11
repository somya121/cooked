package com.cookedapp.cooked_backend.controller;

import com.cookedapp.cooked_backend.dto.*;
import com.cookedapp.cooked_backend.entity.User;
import com.cookedapp.cooked_backend.service.AuthService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*", maxAge = 3600)
public class AuthController {

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    private final AuthService authService;

    @Autowired
    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/check-identifier")
    public ResponseEntity<?> checkUserExistence(@Valid @RequestBody IdentifierRequest request) {
        try {
            logger.info("Checking existence for identifier: {}", request.getIdentifier());
            boolean exists = authService.checkIdentifierExists(request.getIdentifier());
            logger.info("Identifier exists: {}", exists);
            return ResponseEntity.ok(new IdentifierCheckResponse(exists, request.getIdentifier()));
        } catch (Exception e) {
            logger.error("Error checking identifier existence: ", e);
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Error checking identifier: " + e.getMessage()));
        }
    }


    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@Valid @RequestBody RegisterRequest registerRequest) {
        try {
            logger.info("Attempting registration for: {}", registerRequest.getEmail());
            User registeredUser = authService.registerUser(registerRequest);
            logger.info("User registered successfully: {}", registeredUser.getEmail());
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(new MessageResponse("User registered successfully. Please log in."));
        } catch (IllegalArgumentException e) {
            logger.warn("Registration failed (conflict): {}", e.getMessage());
            return ResponseEntity
                    .status(HttpStatus.CONFLICT)
                    .body(new MessageResponse(e.getMessage()));
        } catch (Exception e) {
            logger.error("An error occurred during registration: ", e);
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("An error occurred during registration."));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        logger.info("Attempting login for: {}", loginRequest.getEmail());
        Optional<User> userOptional = authService.loginUser(loginRequest);

        if (userOptional.isPresent()) {
            User user = userOptional.get();
            logger.info("Login successful for: {}", user.getEmail());
            return ResponseEntity.ok(new AuthResponse(
                    "Login successful!",
                    user.getId(),
                    user.getEmail()
            ));
        } else {
            logger.warn("Login failed for: {}", loginRequest.getEmail());
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(new MessageResponse("Login failed: Invalid credentials."));
        }
    }
}