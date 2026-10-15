package com.certflow.api.controller;

import com.certflow.api.security.UserPrincipal;
import com.certflow.api.service.OrganizationService;
import com.certflow.common.domain.UserRole;
import com.certflow.common.dto.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/organizations/{organizationId}/dashboard-stats")
public class DashboardController {

    private final OrganizationService organizationService;
    private final JdbcClient jdbcClient;

    public DashboardController(OrganizationService organizationService, JdbcClient jdbcClient) {
        this.organizationService = organizationService;
        this.jdbcClient = jdbcClient;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDashboardStats(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("organizationId") UUID organizationId
    ) {
        organizationService.verifyMembership(organizationId, principal.getId(), UserRole.VIEWER);

        // 1. Total Events
        Integer totalEvents = jdbcClient.sql("SELECT COUNT(*) FROM events WHERE organization_id = :orgId")
                .param("orgId", organizationId)
                .query(Integer.class)
                .single();

        // 2. Batch Aggregates (total, generated, email_sent, failed)
        String batchStatsSql = """
            SELECT COALESCE(SUM(b.total_count), 0) AS total_count,
                   COALESCE(SUM(b.generated_count), 0) AS generated_count,
                   COALESCE(SUM(b.email_sent_count), 0) AS email_sent_count,
                   COALESCE(SUM(b.failed_count), 0) AS failed_count
            FROM certificate_batches b
            JOIN events e ON b.event_id = e.id
            WHERE e.organization_id = :orgId
            """;

        Map<String, Object> stats = jdbcClient.sql(batchStatsSql)
                .param("orgId", organizationId)
                .query((rs, rowNum) -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("totalParticipants", rs.getInt("total_count"));
                    m.put("totalCertificatesGenerated", rs.getInt("generated_count"));
                    m.put("totalEmailsSent", rs.getInt("email_sent_count"));
                    m.put("totalFailed", rs.getInt("failed_count"));
                    return m;
                })
                .single();

        int totalPart = (int) stats.getOrDefault("totalParticipants", 0);
        int gen = (int) stats.getOrDefault("totalCertificatesGenerated", 0);
        int fail = (int) stats.getOrDefault("totalFailed", 0);
        int pending = Math.max(0, totalPart - (gen + fail));

        stats.put("totalEvents", totalEvents != null ? totalEvents : 0);
        stats.put("totalPendingJobs", pending);

        // 3. Recent Batches
        String recentBatchesSql = """
            SELECT b.id, b.name, b.status, b.total_count, b.generated_count, b.email_sent_count, b.failed_count, b.created_at, e.name as event_name
            FROM certificate_batches b
            JOIN events e ON b.event_id = e.id
            WHERE e.organization_id = :orgId
            ORDER BY b.created_at DESC
            LIMIT 5
            """;

        List<Map<String, Object>> recentBatches = jdbcClient.sql(recentBatchesSql)
                .param("orgId", organizationId)
                .query((rs, rowNum) -> {
                    Map<String, Object> b = new HashMap<>();
                    b.put("id", rs.getObject("id"));
                    b.put("name", rs.getString("name"));
                    b.put("eventName", rs.getString("event_name"));
                    b.put("status", rs.getString("status"));
                    b.put("totalCount", rs.getInt("total_count"));
                    b.put("generatedCount", rs.getInt("generated_count"));
                    b.put("emailSentCount", rs.getInt("email_sent_count"));
                    b.put("failedCount", rs.getInt("failed_count"));
                    b.put("createdAt", rs.getTimestamp("created_at").toInstant().toString());
                    return b;
                })
                .list();

        stats.put("recentBatches", recentBatches);

        return ResponseEntity.ok(ApiResponse.ok(stats));
    }
}
