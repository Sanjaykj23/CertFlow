package com.certflow.api.repository;

import com.certflow.common.domain.Organization;
import com.certflow.common.dto.AuthDtos;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class OrganizationRepository {

    private final JdbcClient jdbcClient;

    public OrganizationRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public Organization save(Organization org) {
        if (org.getId() == null) {
            org.setId(UUID.randomUUID());
        }
        Instant now = Instant.now();
        org.setCreatedAt(now);
        org.setUpdatedAt(now);

        String sql = """
            INSERT INTO organizations (id, name, slug, created_at, updated_at)
            VALUES (:id, :name, :slug, :createdAt, :updatedAt)
            """;

        jdbcClient.sql(sql)
                .param("id", org.getId())
                .param("name", org.getName())
                .param("slug", org.getSlug())
                .param("createdAt", Timestamp.from(org.getCreatedAt()))
                .param("updatedAt", Timestamp.from(org.getUpdatedAt()))
                .update();

        return org;
    }

    public Optional<Organization> findById(UUID id) {
        String sql = "SELECT * FROM organizations WHERE id = :id";
        return jdbcClient.sql(sql)
                .param("id", id)
                .query(Organization.class)
                .optional();
    }

    public List<AuthDtos.OrgMembershipDto> findOrganizationsByUserId(UUID userId) {
        String sql = """
            SELECT o.id as organization_id, o.name as organization_name, o.slug as organization_slug, om.role as role
            FROM organizations o
            JOIN organization_members om ON o.id = om.organization_id
            WHERE om.user_id = :userId
            ORDER BY o.name ASC
            """;

        return jdbcClient.sql(sql)
                .param("userId", userId)
                .query((rs, rowNum) -> AuthDtos.OrgMembershipDto.builder()
                        .organizationId(rs.getString("organization_id"))
                        .organizationName(rs.getString("organization_name"))
                        .organizationSlug(rs.getString("organization_slug"))
                        .role(rs.getString("role"))
                        .build())
                .list();
    }
}
