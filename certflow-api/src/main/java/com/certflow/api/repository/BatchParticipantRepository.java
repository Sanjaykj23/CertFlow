package com.certflow.api.repository;

import com.certflow.common.domain.BatchParticipant;
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
public class BatchParticipantRepository {

    private final JdbcClient jdbcClient;
    private final JdbcTemplate jdbcTemplate;

    public BatchParticipantRepository(JdbcClient jdbcClient, JdbcTemplate jdbcTemplate) {
        this.jdbcClient = jdbcClient;
        this.jdbcTemplate = jdbcTemplate;
    }

    public void saveAll(List<BatchParticipant> participants) {
        if (participants == null || participants.isEmpty()) {
            return;
        }

        UUID batchId = participants.get(0).getBatchId();
        if (batchId != null) {
            jdbcTemplate.update("DELETE FROM batch_participants WHERE batch_id = ?", batchId);
        }

        String sql = """
            INSERT INTO batch_participants (id, batch_id, row_index, participant_name, email, certificate_type, custom_attributes_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """;

        Instant now = Instant.now();
        jdbcTemplate.batchUpdate(sql, participants, 500, (PreparedStatement ps, BatchParticipant p) -> {
            if (p.getId() == null) {
                p.setId(UUID.randomUUID());
            }
            p.setCreatedAt(now);
            ps.setObject(1, p.getId());
            ps.setObject(2, p.getBatchId());
            ps.setInt(3, p.getRowIndex());
            ps.setString(4, p.getParticipantName());
            ps.setString(5, p.getEmail().toLowerCase());
            ps.setString(6, p.getCertificateType());
            ps.setString(7, p.getCustomAttributesJson());
            ps.setTimestamp(8, Timestamp.from(p.getCreatedAt()));
        });
    }

    public List<BatchParticipant> findByBatchId(UUID batchId) {
        String sql = "SELECT * FROM batch_participants WHERE batch_id = :batchId ORDER BY row_index ASC";
        return jdbcClient.sql(sql)
                .param("batchId", batchId)
                .query((rs, rowNum) -> BatchParticipant.builder()
                        .id((UUID) rs.getObject("id"))
                        .batchId((UUID) rs.getObject("batch_id"))
                        .rowIndex(rs.getInt("row_index"))
                        .participantName(rs.getString("participant_name"))
                        .email(rs.getString("email"))
                        .certificateType(rs.getString("certificate_type"))
                        .customAttributesJson(rs.getString("custom_attributes_json"))
                        .createdAt(rs.getTimestamp("created_at").toInstant())
                        .build())
                .list();
    }

    public Optional<BatchParticipant> findById(UUID id) {
        String sql = "SELECT * FROM batch_participants WHERE id = :id";
        return jdbcClient.sql(sql)
                .param("id", id)
                .query((rs, rowNum) -> BatchParticipant.builder()
                        .id((UUID) rs.getObject("id"))
                        .batchId((UUID) rs.getObject("batch_id"))
                        .rowIndex(rs.getInt("row_index"))
                        .participantName(rs.getString("participant_name"))
                        .email(rs.getString("email"))
                        .certificateType(rs.getString("certificate_type"))
                        .customAttributesJson(rs.getString("custom_attributes_json"))
                        .createdAt(rs.getTimestamp("created_at").toInstant())
                        .build())
                .optional();
    }
}
