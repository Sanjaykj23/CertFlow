package com.certflow.api.repository;

import com.certflow.common.domain.Event;
import com.certflow.common.dto.EventDtos;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.sql.Date;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class EventRepository {

    private final JdbcClient jdbcClient;

    public EventRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public Event save(Event event) {
        if (event.getId() == null) {
            event.setId(UUID.randomUUID());
        }
        Instant now = Instant.now();
        event.setCreatedAt(now);
        event.setUpdatedAt(now);

        String sql = """
            INSERT INTO events (id, organization_id, name, description, event_date, archived, created_at, updated_at)
            VALUES (:id, :organizationId, :name, :description, :eventDate, :archived, :createdAt, :updatedAt)
            """;

        jdbcClient.sql(sql)
                .param("id", event.getId())
                .param("organizationId", event.getOrganizationId())
                .param("name", event.getName())
                .param("description", event.getDescription())
                .param("eventDate", Date.valueOf(event.getEventDate()))
                .param("archived", event.isArchived())
                .param("createdAt", Timestamp.from(event.getCreatedAt()))
                .param("updatedAt", Timestamp.from(event.getUpdatedAt()))
                .update();

        return event;
    }

    public void update(Event event) {
        event.setUpdatedAt(Instant.now());
        String sql = """
            UPDATE events
            SET name = :name, description = :description, event_date = :eventDate, archived = :archived, updated_at = :updatedAt
            WHERE id = :id
            """;

        jdbcClient.sql(sql)
                .param("id", event.getId())
                .param("name", event.getName())
                .param("description", event.getDescription())
                .param("eventDate", Date.valueOf(event.getEventDate()))
                .param("archived", event.isArchived())
                .param("updatedAt", Timestamp.from(event.getUpdatedAt()))
                .update();
    }

    public Optional<Event> findById(UUID id) {
        String sql = "SELECT * FROM events WHERE id = :id";
        return jdbcClient.sql(sql)
                .param("id", id)
                .query((rs, rowNum) -> Event.builder()
                        .id((UUID) rs.getObject("id"))
                        .organizationId((UUID) rs.getObject("organization_id"))
                        .name(rs.getString("name"))
                        .description(rs.getString("description"))
                        .eventDate(rs.getDate("event_date").toLocalDate())
                        .archived(rs.getBoolean("archived"))
                        .createdAt(rs.getTimestamp("created_at").toInstant())
                        .updatedAt(rs.getTimestamp("updated_at").toInstant())
                        .build())
                .optional();
    }

    public List<EventDtos.EventDto> findByOrganizationId(UUID organizationId) {
        String sql = """
            SELECT e.id, e.organization_id, e.name, e.description, e.event_date, e.archived, e.created_at, e.updated_at,
                   COUNT(DISTINCT b.id) AS batch_count,
                   COUNT(DISTINCT c.id) AS certificate_count
            FROM events e
            LEFT JOIN certificate_batches b ON e.id = b.event_id
            LEFT JOIN certificates c ON e.id = c.event_id
            WHERE e.organization_id = :orgId
            GROUP BY e.id, e.organization_id, e.name, e.description, e.event_date, e.archived, e.created_at, e.updated_at
            ORDER BY e.event_date DESC, e.created_at DESC
            """;

        return jdbcClient.sql(sql)
                .param("orgId", organizationId)
                .query((rs, rowNum) -> EventDtos.EventDto.builder()
                        .id((UUID) rs.getObject("id"))
                        .organizationId((UUID) rs.getObject("organization_id"))
                        .name(rs.getString("name"))
                        .description(rs.getString("description"))
                        .eventDate(rs.getDate("event_date").toLocalDate())
                        .archived(rs.getBoolean("archived"))
                        .batchCount(rs.getInt("batch_count"))
                        .certificateCount(rs.getInt("certificate_count"))
                        .createdAt(rs.getTimestamp("created_at").toInstant())
                        .updatedAt(rs.getTimestamp("updated_at").toInstant())
                        .build())
                .list();
    }
}
