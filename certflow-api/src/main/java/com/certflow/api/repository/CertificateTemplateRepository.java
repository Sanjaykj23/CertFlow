package com.certflow.api.repository;

import com.certflow.common.domain.CertificateTemplate;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class CertificateTemplateRepository {

    private final JdbcClient jdbcClient;

    public CertificateTemplateRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public CertificateTemplate save(CertificateTemplate template) {
        if (template.getId() == null) {
            template.setId(UUID.randomUUID());
        }
        Instant now = Instant.now();
        template.setCreatedAt(now);
        template.setUpdatedAt(now);

        String sql = """
            INSERT INTO certificate_templates (id, event_id, name, background_storage_key, orientation, width, height, layout_json, version, created_at, updated_at)
            VALUES (:id, :eventId, :name, :backgroundStorageKey, :orientation, :width, :height, :layoutJson, :version, :createdAt, :updatedAt)
            """;

        jdbcClient.sql(sql)
                .param("id", template.getId())
                .param("eventId", template.getEventId())
                .param("name", template.getName())
                .param("backgroundStorageKey", template.getBackgroundStorageKey())
                .param("orientation", template.getOrientation())
                .param("width", template.getWidth())
                .param("height", template.getHeight())
                .param("layoutJson", template.getLayoutJson())
                .param("version", template.getVersion())
                .param("createdAt", Timestamp.from(template.getCreatedAt()))
                .param("updatedAt", Timestamp.from(template.getUpdatedAt()))
                .update();

        return template;
    }

    public void update(CertificateTemplate template) {
        template.setUpdatedAt(Instant.now());
        template.setVersion(template.getVersion() + 1);

        String sql = """
            UPDATE certificate_templates
            SET name = :name, background_storage_key = :backgroundStorageKey, orientation = :orientation,
                width = :width, height = :height, layout_json = :layoutJson, version = :version, updated_at = :updatedAt
            WHERE id = :id
            """;

        jdbcClient.sql(sql)
                .param("id", template.getId())
                .param("name", template.getName())
                .param("backgroundStorageKey", template.getBackgroundStorageKey())
                .param("orientation", template.getOrientation())
                .param("width", template.getWidth())
                .param("height", template.getHeight())
                .param("layoutJson", template.getLayoutJson())
                .param("version", template.getVersion())
                .param("updatedAt", Timestamp.from(template.getUpdatedAt()))
                .update();
    }

    public Optional<CertificateTemplate> findById(UUID id) {
        String sql = "SELECT * FROM certificate_templates WHERE id = :id";
        return jdbcClient.sql(sql)
                .param("id", id)
                .query((rs, rowNum) -> CertificateTemplate.builder()
                        .id((UUID) rs.getObject("id"))
                        .eventId((UUID) rs.getObject("event_id"))
                        .name(rs.getString("name"))
                        .backgroundStorageKey(rs.getString("background_storage_key"))
                        .orientation(rs.getString("orientation"))
                        .width(rs.getInt("width"))
                        .height(rs.getInt("height"))
                        .layoutJson(rs.getString("layout_json"))
                        .version(rs.getInt("version"))
                        .createdAt(rs.getTimestamp("created_at").toInstant())
                        .updatedAt(rs.getTimestamp("updated_at").toInstant())
                        .build())
                .optional();
    }

    public List<CertificateTemplate> findByEventId(UUID eventId) {
        String sql = "SELECT * FROM certificate_templates WHERE event_id = :eventId ORDER BY created_at DESC";
        return jdbcClient.sql(sql)
                .param("eventId", eventId)
                .query((rs, rowNum) -> CertificateTemplate.builder()
                        .id((UUID) rs.getObject("id"))
                        .eventId((UUID) rs.getObject("event_id"))
                        .name(rs.getString("name"))
                        .backgroundStorageKey(rs.getString("background_storage_key"))
                        .orientation(rs.getString("orientation"))
                        .width(rs.getInt("width"))
                        .height(rs.getInt("height"))
                        .layoutJson(rs.getString("layout_json"))
                        .version(rs.getInt("version"))
                        .createdAt(rs.getTimestamp("created_at").toInstant())
                        .updatedAt(rs.getTimestamp("updated_at").toInstant())
                        .build())
                .list();
    }
}
