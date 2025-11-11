package com.cookedapp.cooked_backend.repository;

import com.cookedapp.cooked_backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository // Optional, but good practice
public interface UserRepository extends JpaRepository<User, Long> { // Entity is User, Primary Key type is Long

    // Spring Data JPA automatically implements this method based on its name
    Optional<User> findByUsername(String username);

    // Add methods for finding by email if you have an email field
    // Optional<User> findByEmail(String email);

    Boolean existsByUsername(String username);

    // Boolean existsByEmail(String email);
}