package com.certflow.api.repository;

import com.certflow.common.domain.AuditLog;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public class AuditLogRepository {

    private final JdbcClient jdbcClient;

    public AuditLogRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public void save(AuditLog log) {
        if (log.getId() == null) {
            log.setId(UUID.randomUUID());
        }
        Instant now = Instant.now();
        log.setCreatedAt(now);

        String sql = """
            INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details_json, ip_address, created_at)
            VALUES (:id, :orgId, :userId, :action, :resourceType, :resourceId, :detailsJson, :ipAddress, :createdAt)
            """;

        jdbcClient.sql(sql)
                .param("id", log.getId())
                .param("orgId", log.getOrganizationId())
                .param("userId", log.getUserId())
                .param("action", log.getAction())
                .param("resourceType", log.getResourceType())
                .param("resourceId", log.getResourceId())
                .param("detailsJson", log.getDetailsJson())
                .param("ipAddress", log.getIpAddress())
                .param("createdAt", Timestamp.from(log.getCreatedAt()))
                .update();
    }

    public List<AuditLog> findByOrganizationId(UUID organizationId, int limit, int offset) {
        String sql = """
            SELECT * FROM audit_logs
            WHERE organization_id = :orgId
            ORDER BY created_at DESC
            LIMIT :limit OFFSET :offset
            """;

        return jdbcClient.sql(sql)
                .param("orgId", organizationId)
                .param("limit", limit)
                .param("offset", offset)
                .query((rs, rowNum) -> AuditLog.builder()
                        .id((UUID) rs.getObject("id"))
                        .organizationId((UUID) rs.getObject("organization_id"))
                        .userId((UUID) rs.getObject("user_id"))
                        .action(rs.getString("action"))
                        .resourceType(rs.getString("resource_type"))
                        .resourceId((UUID) rs.getObject("resource_id"))
                        .detailsJson(rs.getString("details_json"))
                        .ipAddress(rs.getString("ip_address"))
                        .createdAt(rs.getTimestamp("created_at").toInstant())
                        .build())
                .list();
    }
}
