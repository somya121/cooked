package com.cookedapp.cooked_backend.service;

import com.cookedapp.cooked_backend.dto.LoginRequest;
import com.cookedapp.cooked_backend.dto.RegisterRequest;
import com.cookedapp.cooked_backend.entity.User;
import com.cookedapp.cooked_backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Autowired
    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public boolean checkIdentifierExists(String identifier) {
        return userRepository.existsByEmail(identifier);
    }


    @Transactional // Ensure atomicity
    public User registerUser(RegisterRequest registerRequest) {
        if (userRepository.existsByEmail(registerRequest.getEmail())) {
            throw new IllegalArgumentException("Error: Email is already taken!");
        }

        User user = new User();
        user.setEmail(registerRequest.getEmail());
        user.setPassword(passwordEncoder.encode(registerRequest.getPassword()));
        return userRepository.save(user);
    }

    public Optional<User> loginUser(LoginRequest loginRequest) {
        Optional<User> userOptional = userRepository.findByEmail(loginRequest.getEmail());

        if (userOptional.isPresent()) {
            User user = userOptional.get();
            if (passwordEncoder.matches(loginRequest.getPassword(), user.getPassword())) {
                return userOptional;
            }
        }
        return Optional.empty();
    }
}