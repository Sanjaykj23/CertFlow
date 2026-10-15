package com.certflow.api.repository;

import com.certflow.common.domain.BatchStatus;
import com.certflow.common.domain.CertificateBatch;
import com.certflow.common.dto.BatchDtos;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class CertificateBatchRepository {

    private final JdbcClient jdbcClient;

    public CertificateBatchRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public CertificateBatch save(CertificateBatch batch) {
        if (batch.getId() == null) {
            batch.setId(UUID.randomUUID());
        }
        Instant now = Instant.now();
        batch.setCreatedAt(now);
        batch.setUpdatedAt(now);
        if (batch.getStatus() == null) {
            batch.setStatus(BatchStatus.DRAFT);
        }

        String sql = """
            INSERT INTO certificate_batches (id, event_id, template_id, name, total_count, generated_count, email_sent_count, failed_count, status, created_at, updated_at)
            VALUES (:id, :eventId, :templateId, :name, :totalCount, :generatedCount, :emailSentCount, :failedCount, :status, :createdAt, :updatedAt)
            """;

        jdbcClient.sql(sql)
                .param("id", batch.getId())
                .param("eventId", batch.getEventId())
                .param("templateId", batch.getTemplateId())
                .param("name", batch.getName())
                .param("totalCount", batch.getTotalCount())
                .param("generatedCount", batch.getGeneratedCount())
                .param("emailSentCount", batch.getEmailSentCount())
                .param("failedCount", batch.getFailedCount())
                .param("status", batch.getStatus().name())
                .param("createdAt", Timestamp.from(batch.getCreatedAt()))
                .param("updatedAt", Timestamp.from(batch.getUpdatedAt()))
                .update();

        return batch;
    }

    public void updateStatus(UUID batchId, BatchStatus status) {
        Instant now = Instant.now();
        String sql = """
            UPDATE certificate_batches
            SET status = :status, updated_at = :now,
                completed_at = CASE WHEN :status IN ('COMPLETED', 'PARTIALLY_FAILED', 'FAILED') THEN :now ELSE completed_at END
            WHERE id = :id
            """;

        jdbcClient.sql(sql)
                .param("id", batchId)
                .param("status", status.name())
                .param("now", Timestamp.from(now))
                .update();
    }

    public void incrementCounters(UUID batchId, int genDelta, int emailDelta, int failDelta) {
        String sql = """
            UPDATE certificate_batches
            SET generated_count = generated_count + :genDelta,
                email_sent_count = email_sent_count + :emailDelta,
                failed_count = failed_count + :failDelta,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :id
            """;

        jdbcClient.sql(sql)
                .param("id", batchId)
                .param("genDelta", genDelta)
                .param("emailDelta", emailDelta)
                .param("failDelta", failDelta)
                .update();
    }

    public Optional<CertificateBatch> findById(UUID id) {
        String sql = "SELECT * FROM certificate_batches WHERE id = :id";
        return jdbcClient.sql(sql)
                .param("id", id)
                .query((rs, rowNum) -> CertificateBatch.builder()
                        .id((UUID) rs.getObject("id"))
                        .eventId((UUID) rs.getObject("event_id"))
                        .templateId((UUID) rs.getObject("template_id"))
                        .name(rs.getString("name"))
                        .totalCount(rs.getInt("total_count"))
                        .generatedCount(rs.getInt("generated_count"))
                        .emailSentCount(rs.getInt("email_sent_count"))
                        .failedCount(rs.getInt("failed_count"))
                        .status(BatchStatus.valueOf(rs.getString("status")))
                        .createdAt(rs.getTimestamp("created_at").toInstant())
                        .updatedAt(rs.getTimestamp("updated_at").toInstant())
                        .completedAt(rs.getTimestamp("completed_at") != null ? rs.getTimestamp("completed_at").toInstant() : null)
                        .build())
                .optional();
    }

    public List<BatchDtos.BatchDto> findByEventId(UUID eventId) {
        String sql = """
            SELECT b.id, b.event_id, b.template_id, t.name as template_name, b.name,
                   b.total_count, b.generated_count, b.email_sent_count, b.failed_count,
                   b.status, b.created_at, b.completed_at
            FROM certificate_batches b
            LEFT JOIN certificate_templates t ON b.template_id = t.id
            WHERE b.event_id = :eventId
            ORDER BY b.created_at DESC
            """;

        return jdbcClient.sql(sql)
                .param("eventId", eventId)
                .query((rs, rowNum) -> BatchDtos.BatchDto.builder()
                        .id((UUID) rs.getObject("id"))
                        .eventId((UUID) rs.getObject("event_id"))
                        .templateId((UUID) rs.getObject("template_id"))
                        .templateName(rs.getString("template_name"))
                        .name(rs.getString("name"))
                        .totalCount(rs.getInt("total_count"))
                        .generatedCount(rs.getInt("generated_count"))
                        .emailSentCount(rs.getInt("email_sent_count"))
                        .failedCount(rs.getInt("failed_count"))
                        .status(BatchStatus.valueOf(rs.getString("status")))
                        .createdAt(rs.getTimestamp("created_at").toInstant())
                        .completedAt(rs.getTimestamp("completed_at") != null ? rs.getTimestamp("completed_at").toInstant() : null)
                        .build())
                .list();
    }
}
