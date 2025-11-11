package com.cookedapp.cooked_backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails; // Important: Use Spring Security's UserDetails

import java.util.Collection;
import java.util.Collections; // For empty authorities list

@Data // Lombok: Generates getters, setters, equals, hashCode, toString
@Builder // Lombok: Provides a builder pattern
@NoArgsConstructor // Lombok: Generates a no-args constructor
@AllArgsConstructor // Lombok: Generates an all-args constructor
@Entity
@Table(name = "users") // Specifies the table name in the database
public class User implements UserDetails { // Implement UserDetails for Spring Security

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY) // Use database auto-increment
    private Long id;

    @Column(unique = true, nullable = false)
    private String username; // Or identifier, email etc.

    @Column(nullable = false)
    private String password; // Store hashed passwords!

    // Add other fields as needed (e.g., email, firstName, lastName)
    // @Column(unique = true, nullable = false)
    // private String email;

    // --- UserDetails Methods ---
    // For simplicity, we'll assume a single role or no specific roles initially
    // You can expand this later with a Role entity and a ManyToMany relationship

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        // Return a list of authorities/roles for the user
        // For now, return an empty list or a default role if needed
        return Collections.emptyList();
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return username;
    }

    // You can implement logic here based on database fields if needed
    @Override
    public boolean isAccountNonExpired() {
        return true; // Defaulting to true
    }

    @Override
    public boolean isAccountNonLocked() {
        return true; // Defaulting to true
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true; // Defaulting to true
    }

    @Override
    public boolean isEnabled() {
        return true; // Defaulting to true
    }
}