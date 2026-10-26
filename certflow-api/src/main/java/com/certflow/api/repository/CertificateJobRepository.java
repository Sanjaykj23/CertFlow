package com.certflow.api.repository;

import com.certflow.common.domain.CertificateJob;
import com.certflow.common.domain.EmailStatus;
import com.certflow.common.domain.ErrorCategory;
import com.certflow.common.domain.JobStatus;
import com.certflow.common.dto.BatchDtos;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class CertificateJobRepository {

    private final JdbcClient jdbcClient;
    private final JdbcTemplate jdbcTemplate;

    public CertificateJobRepository(JdbcClient jdbcClient, JdbcTemplate jdbcTemplate) {
        this.jdbcClient = jdbcClient;
        this.jdbcTemplate = jdbcTemplate;
    }

    public void saveAll(List<CertificateJob> jobs) {
        if (jobs == null || jobs.isEmpty()) {
            return;
        }

        String sql = """
            INSERT INTO certificate_jobs (id, batch_id, participant_id, status, attempt_count, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """;

        Instant now = Instant.now();
        jdbcTemplate.batchUpdate(sql, jobs, 500, (PreparedStatement ps, CertificateJob job) -> {
            if (job.getId() == null) {
                job.setId(UUID.randomUUID());
            }
            job.setCreatedAt(now);
            job.setUpdatedAt(now);
            ps.setObject(1, job.getId());
            ps.setObject(2, job.getBatchId());
            ps.setObject(3, job.getParticipantId());
            ps.setString(4, job.getStatus() != null ? job.getStatus().name() : JobStatus.PENDING.name());
            ps.setInt(5, job.getAttemptCount());
            ps.setTimestamp(6, Timestamp.from(job.getCreatedAt()));
            ps.setTimestamp(7, Timestamp.from(job.getUpdatedAt()));
        });
    }

    public Optional<CertificateJob> findById(UUID id) {
        String sql = "SELECT * FROM certificate_jobs WHERE id = :id";
        return jdbcClient.sql(sql)
                .param("id", id)
                .query((rs, rowNum) -> CertificateJob.builder()
                        .id((UUID) rs.getObject("id"))
                        .batchId((UUID) rs.getObject("batch_id"))
                        .participantId((UUID) rs.getObject("participant_id"))
                        .status(JobStatus.valueOf(rs.getString("status")))
                        .attemptCount(rs.getInt("attempt_count"))
                        .errorMessage(rs.getString("error_message"))
                        .errorCategory(rs.getString("error_category") != null ? ErrorCategory.valueOf(rs.getString("error_category")) : null)
                        .nextRetryAt(rs.getTimestamp("next_retry_at") != null ? rs.getTimestamp("next_retry_at").toInstant() : null)
                        .lockedBy(rs.getString("locked_by"))
                        .lockedAt(rs.getTimestamp("locked_at") != null ? rs.getTimestamp("locked_at").toInstant() : null)
                        .createdAt(rs.getTimestamp("created_at").toInstant())
                        .updatedAt(rs.getTimestamp("updated_at").toInstant())
                        .build())
                .optional();
    }

    public boolean claimJob(UUID jobId, String workerId) {
        String sql = """
            UPDATE certificate_jobs
            SET status = 'PROCESSING', locked_by = :workerId, locked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE id = :jobId AND status IN ('PENDING', 'QUEUED')
            """;

        int rows = jdbcClient.sql(sql)
                .param("jobId", jobId)
                .param("workerId", workerId)
                .update();

        return rows > 0;
    }

    public void markGenerated(UUID jobId) {
        String sql = """
            UPDATE certificate_jobs
            SET status = 'GENERATED', error_message = NULL, updated_at = CURRENT_TIMESTAMP
            WHERE id = :id
            """;

        jdbcClient.sql(sql).param("id", jobId).update();
    }

    public void markFailed(UUID jobId, String errorMessage, ErrorCategory category, Instant nextRetryAt) {
        String sql = """
            UPDATE certificate_jobs
            SET status = 'FAILED',
                error_message = :err,
                error_category = :cat,
                attempt_count = attempt_count + 1,
                next_retry_at = :retryAt,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :id
            """;

        jdbcClient.sql(sql)
                .param("id", jobId)
                .param("err", errorMessage)
                .param("cat", category != null ? category.name() : ErrorCategory.TRANSIENT.name())
                .param("retryAt", nextRetryAt != null ? Timestamp.from(nextRetryAt) : null)
                .update();
    }

    public List<BatchDtos.BatchJobSummaryDto> findRecentFailures(UUID batchId, int limit) {
        String sql = """
            SELECT j.id, p.participant_name, p.email, j.status, c.email_status, j.attempt_count,
                   COALESCE(j.error_message, (SELECT error_message FROM email_delivery_attempts WHERE certificate_id = c.id ORDER BY attempted_at DESC LIMIT 1)) as error_message,
                   j.updated_at
            FROM certificate_jobs j
            JOIN batch_participants p ON j.participant_id = p.id
            LEFT JOIN certificates c ON c.job_id = j.id
            WHERE j.batch_id = :batchId AND (j.status = 'FAILED' OR c.email_status = 'FAILED')
            ORDER BY j.updated_at DESC
            LIMIT :limit
            """;

        return jdbcClient.sql(sql)
                .param("batchId", batchId)
                .param("limit", limit)
                .query((rs, rowNum) -> {
                    String emailStatusStr = rs.getString("email_status");
                    return BatchDtos.BatchJobSummaryDto.builder()
                            .jobId((UUID) rs.getObject("id"))
                            .participantName(rs.getString("participant_name"))
                            .email(rs.getString("email"))
                            .status(JobStatus.valueOf(rs.getString("status")))
                            .emailStatus(emailStatusStr != null ? EmailStatus.valueOf(emailStatusStr) : null)
                            .attemptCount(rs.getInt("attempt_count"))
                            .errorMessage(rs.getString("error_message"))
                            .updatedAt(rs.getTimestamp("updated_at").toInstant())
                            .build();
                })
                .list();
    }

    public List<BatchDtos.BatchJobSummaryDto> findJobsByBatch(UUID batchId, int limit, int offset) {
        String sql = """
            SELECT j.id, p.participant_name, p.email, j.status, c.email_status, j.attempt_count,
                   COALESCE(j.error_message, (SELECT error_message FROM email_delivery_attempts WHERE certificate_id = c.id ORDER BY attempted_at DESC LIMIT 1)) as error_message,
                   j.updated_at
            FROM certificate_jobs j
            JOIN batch_participants p ON j.participant_id = p.id
            LEFT JOIN certificates c ON c.job_id = j.id
            WHERE j.batch_id = :batchId
            ORDER BY p.row_index ASC
            LIMIT :limit OFFSET :offset
            """;

        return jdbcClient.sql(sql)
                .param("batchId", batchId)
                .param("limit", limit)
                .param("offset", offset)
                .query((rs, rowNum) -> {
                    String emailStatusStr = rs.getString("email_status");
                    return BatchDtos.BatchJobSummaryDto.builder()
                            .jobId((UUID) rs.getObject("id"))
                            .participantName(rs.getString("participant_name"))
                            .email(rs.getString("email"))
                            .status(JobStatus.valueOf(rs.getString("status")))
                            .emailStatus(emailStatusStr != null ? EmailStatus.valueOf(emailStatusStr) : null)
                            .attemptCount(rs.getInt("attempt_count"))
                            .errorMessage(rs.getString("error_message"))
                            .updatedAt(rs.getTimestamp("updated_at").toInstant())
                            .build();
                })
                .list();
    }

    public void markCancelled(UUID jobId) {
        jdbcClient.sql("UPDATE certificate_jobs SET status = 'CANCELLED', error_message = 'Batch cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = :id")
                .param("id", jobId)
                .update();
    }

    /** Jobs of the batch that have not reached a terminal state yet. */
    public int countUnfinishedJobs(UUID batchId) {
        Integer n = jdbcClient.sql("SELECT COUNT(*) FROM certificate_jobs WHERE batch_id = :batchId AND status IN ('PENDING', 'QUEUED', 'PROCESSING')")
                .param("batchId", batchId)
                .query(Integer.class)
                .single();
        return n != null ? n : 0;
    }

    public List<CertificateJob> findQueuedJobs(int limit) {
        String sql = "SELECT * FROM certificate_jobs WHERE status IN ('QUEUED', 'PENDING') ORDER BY created_at ASC LIMIT :limit";
        return jdbcClient.sql(sql)
                .param("limit", limit)
                .query((rs, rowNum) -> CertificateJob.builder()
                        .id((UUID) rs.getObject("id"))
                        .batchId((UUID) rs.getObject("batch_id"))
                        .participantId((UUID) rs.getObject("participant_id"))
                        .status(JobStatus.valueOf(rs.getString("status")))
                        .attemptCount(rs.getInt("attempt_count"))
                        .errorMessage(rs.getString("error_message"))
                        .createdAt(rs.getTimestamp("created_at").toInstant())
                        .updatedAt(rs.getTimestamp("updated_at").toInstant())
                        .build())
                .list();
    }
}
