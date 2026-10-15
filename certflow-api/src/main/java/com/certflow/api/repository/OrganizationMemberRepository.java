package com.certflow.api.repository;

import com.certflow.common.domain.OrganizationMember;
import com.certflow.common.domain.UserRole;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Repository
public class OrganizationMemberRepository {

    private final JdbcClient jdbcClient;

    public OrganizationMemberRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public OrganizationMember save(OrganizationMember member) {
        if (member.getId() == null) {
            member.setId(UUID.randomUUID());
        }
        Instant now = Instant.now();
        member.setCreatedAt(now);

        String sql = """
            INSERT INTO organization_members (id, organization_id, user_id, role, created_at)
            VALUES (:id, :organizationId, :userId, :role, :createdAt)
            """;

        jdbcClient.sql(sql)
                .param("id", member.getId())
                .param("organizationId", member.getOrganizationId())
                .param("userId", member.getUserId())
                .param("role", member.getRole().name())
                .param("createdAt", Timestamp.from(member.getCreatedAt()))
                .update();

        return member;
    }

    public Optional<OrganizationMember> findByOrganizationAndUser(UUID organizationId, UUID userId) {
        String sql = """
            SELECT id, organization_id, user_id, role, created_at
            FROM organization_members
            WHERE organization_id = :orgId AND user_id = :userId
            """;

        return jdbcClient.sql(sql)
                .param("orgId", organizationId)
                .param("userId", userId)
                .query((rs, rowNum) -> OrganizationMember.builder()
                        .id((UUID) rs.getObject("id"))
                        .organizationId((UUID) rs.getObject("organization_id"))
                        .userId((UUID) rs.getObject("user_id"))
                        .role(UserRole.valueOf(rs.getString("role")))
                        .createdAt(rs.getTimestamp("created_at").toInstant())
                        .build())
                .optional();
    }

    public java.util.List<java.util.Map<String, Object>> findByOrganizationIdWithUserDetails(UUID orgId) {
        String sql = """
            SELECT m.id, m.user_id, u.full_name, u.email, m.role, m.created_at
            FROM organization_members m
            JOIN users u ON m.user_id = u.id
            WHERE m.organization_id = :orgId
            ORDER BY m.created_at ASC
            """;

        return jdbcClient.sql(sql)
                .param("orgId", orgId)
                .query((rs, rowNum) -> {
                    java.util.Map<String, Object> map = new java.util.HashMap<>();
                    map.put("id", rs.getObject("id"));
                    map.put("userId", rs.getObject("user_id"));
                    map.put("name", rs.getString("full_name"));
                    map.put("email", rs.getString("email"));
                    map.put("role", rs.getString("role"));
                    map.put("joinedAt", rs.getTimestamp("created_at").toInstant().toString());
                    return map;
                })
                .list();
    }
}
