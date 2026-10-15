package com.certflow.api.repository;

import com.certflow.common.domain.User;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Repository
public class UserRepository {

    private final JdbcClient jdbcClient;

    public UserRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public User save(User user) {
        if (user.getId() == null) {
            user.setId(UUID.randomUUID());
        }
        Instant now = Instant.now();
        user.setCreatedAt(now);
        user.setUpdatedAt(now);

        String sql = """
            INSERT INTO users (id, email, password_hash, full_name, created_at, updated_at)
            VALUES (:id, :email, :passwordHash, :fullName, :createdAt, :updatedAt)
            """;

        jdbcClient.sql(sql)
                .param("id", user.getId())
                .param("email", user.getEmail().toLowerCase())
                .param("passwordHash", user.getPasswordHash())
                .param("fullName", user.getFullName())
                .param("createdAt", Timestamp.from(user.getCreatedAt()))
                .param("updatedAt", Timestamp.from(user.getUpdatedAt()))
                .update();

        return user;
    }

    public Optional<User> findById(UUID id) {
        String sql = "SELECT * FROM users WHERE id = :id";
        return jdbcClient.sql(sql)
                .param("id", id)
                .query(User.class)
                .optional();
    }

    public Optional<User> findByEmail(String email) {
        String sql = "SELECT * FROM users WHERE LOWER(email) = LOWER(:email)";
        return jdbcClient.sql(sql)
                .param("email", email)
                .query(User.class)
                .optional();
    }

    public void updatePassword(UUID userId, String passwordHash) {
        String sql = "UPDATE users SET password_hash = :passwordHash, updated_at = :updatedAt WHERE id = :id";
        jdbcClient.sql(sql)
                .param("id", userId)
                .param("passwordHash", passwordHash)
                .param("updatedAt", Timestamp.from(Instant.now()))
                .update();
    }
}
