package com.certflow.api.repository;

import com.certflow.common.domain.OutboxEvent;
import com.certflow.common.domain.OutboxStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public class OutboxEventRepository {

    private final JdbcClient jdbcClient;
    private final JdbcTemplate jdbcTemplate;

    public OutboxEventRepository(JdbcClient jdbcClient, JdbcTemplate jdbcTemplate) {
        this.jdbcClient = jdbcClient;
        this.jdbcTemplate = jdbcTemplate;
    }

    public void save(OutboxEvent event) {
        if (event.getId() == null) {
            event.setId(UUID.randomUUID());
        }
        Instant now = Instant.now();
        event.setCreatedAt(now);
        if (event.getStatus() == null) {
            event.setStatus(OutboxStatus.PENDING);
        }

        String sql = """
            INSERT INTO outbox_events (id, aggregate_type, aggregate_id, event_type, payload_json, status, attempt_count, created_at)
            VALUES (:id, :aggregateType, :aggregateId, :eventType, :payloadJson, :status, :attemptCount, :createdAt)
            """;

        jdbcClient.sql(sql)
                .param("id", event.getId())
                .param("aggregateType", event.getAggregateType())
                .param("aggregateId", event.getAggregateId())
                .param("eventType", event.getEventType())
                .param("payloadJson", event.getPayloadJson())
                .param("status", event.getStatus().name())
                .param("attemptCount", event.getAttemptCount())
                .param("createdAt", Timestamp.from(event.getCreatedAt()))
                .update();
    }

    public void saveAll(List<OutboxEvent> events) {
        if (events == null || events.isEmpty()) {
            return;
        }

        String sql = """
            INSERT INTO outbox_events (id, aggregate_type, aggregate_id, event_type, payload_json, status, attempt_count, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """;

        Instant now = Instant.now();
        jdbcTemplate.batchUpdate(sql, events, 500, (PreparedStatement ps, OutboxEvent e) -> {
            if (e.getId() == null) {
                e.setId(UUID.randomUUID());
            }
            e.setCreatedAt(now);
            if (e.getStatus() == null) {
                e.setStatus(OutboxStatus.PENDING);
            }
            ps.setObject(1, e.getId());
            ps.setString(2, e.getAggregateType());
            ps.setObject(3, e.getAggregateId());
            ps.setString(4, e.getEventType());
            ps.setString(5, e.getPayloadJson());
            ps.setString(6, e.getStatus().name());
            ps.setInt(7, e.getAttemptCount());
            ps.setTimestamp(8, Timestamp.from(e.getCreatedAt()));
        });
    }

    public List<OutboxEvent> findPendingEvents(int limit) {
        String sql = """
            SELECT id, aggregate_type, aggregate_id, event_type, payload_json, status, attempt_count, last_error, created_at, published_at
            FROM outbox_events
            WHERE status = 'PENDING'
            ORDER BY created_at ASC
            LIMIT :limit
            FOR UPDATE SKIP LOCKED
            """;

        return jdbcClient.sql(sql)
                .param("limit", limit)
                .query((rs, rowNum) -> OutboxEvent.builder()
                        .id((UUID) rs.getObject("id"))
                        .aggregateType(rs.getString("aggregate_type"))
                        .aggregateId((UUID) rs.getObject("aggregate_id"))
                        .eventType(rs.getString("event_type"))
                        .payloadJson(rs.getString("payload_json"))
                        .status(OutboxStatus.valueOf(rs.getString("status")))
                        .attemptCount(rs.getInt("attempt_count"))
                        .lastError(rs.getString("last_error"))
                        .createdAt(rs.getTimestamp("created_at").toInstant())
                        .publishedAt(rs.getTimestamp("published_at") != null ? rs.getTimestamp("published_at").toInstant() : null)
                        .build())
                .list();
    }

    public void markPublished(UUID id) {
        String sql = """
            UPDATE outbox_events
            SET status = 'PUBLISHED', published_at = CURRENT_TIMESTAMP
            WHERE id = :id
            """;

        jdbcClient.sql(sql).param("id", id).update();
    }

    public void markFailed(UUID id, String error) {
        String sql = """
            UPDATE outbox_events
            SET status = 'FAILED', last_error = :err, attempt_count = attempt_count + 1
            WHERE id = :id
            """;

        jdbcClient.sql(sql)
                .param("id", id)
                .param("err", error)
                .update();
    }
}
