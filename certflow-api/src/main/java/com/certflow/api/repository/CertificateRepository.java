package com.certflow.api.repository;

import com.certflow.common.domain.Certificate;
import com.certflow.common.domain.CertificateStatus;
import com.certflow.common.domain.EmailStatus;
import com.certflow.common.dto.CertificateDtos;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class CertificateRepository {

    private final JdbcClient jdbcClient;

    public CertificateRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public Certificate save(Certificate cert) {
        if (cert.getId() == null) {
            cert.setId(UUID.randomUUID());
        }
        Instant now = Instant.now();
        cert.setCreatedAt(now);
        cert.setUpdatedAt(now);
        if (cert.getIssuedAt() == null) {
            cert.setIssuedAt(now);
        }

        String sql = """
            INSERT INTO certificates (
                id, job_id, event_id, template_id, template_version, certificate_number,
                verification_token, participant_name, recipient_email, certificate_type,
                pdf_storage_key, status, email_status, replacement_for_id, replaced_by_id,
                revocation_reason, issued_at, revoked_at, created_at, updated_at
            ) VALUES (
                :id, :jobId, :eventId, :templateId, :templateVersion, :certificateNumber,
                :verificationToken, :participantName, :recipientEmail, :certificateType,
                :pdfStorageKey, :status, :emailStatus, :replacementForId, :replacedById,
                :revocationReason, :issuedAt, :revokedAt, :createdAt, :updatedAt
            )
            """;

        jdbcClient.sql(sql)
                .param("id", cert.getId())
                .param("jobId", cert.getJobId())
                .param("eventId", cert.getEventId())
                .param("templateId", cert.getTemplateId())
                .param("templateVersion", cert.getTemplateVersion())
                .param("certificateNumber", cert.getCertificateNumber())
                .param("verificationToken", cert.getVerificationToken())
                .param("participantName", cert.getParticipantName())
                .param("recipientEmail", cert.getRecipientEmail().toLowerCase())
                .param("certificateType", cert.getCertificateType())
                .param("pdfStorageKey", cert.getPdfStorageKey())
                .param("status", cert.getStatus().name())
                .param("emailStatus", cert.getEmailStatus().name())
                .param("replacementForId", cert.getReplacementForId())
                .param("replacedById", cert.getReplacedById())
                .param("revocationReason", cert.getRevocationReason())
                .param("issuedAt", Timestamp.from(cert.getIssuedAt()))
                .param("revokedAt", cert.getRevokedAt() != null ? Timestamp.from(cert.getRevokedAt()) : null)
                .param("createdAt", Timestamp.from(cert.getCreatedAt()))
                .param("updatedAt", Timestamp.from(cert.getUpdatedAt()))
                .update();

        return cert;
    }

    public Optional<Certificate> findById(UUID id) {
        String sql = "SELECT * FROM certificates WHERE id = :id";
        return jdbcClient.sql(sql)
                .param("id", id)
                .query(this::mapRow)
                .optional();
    }

    public Optional<Certificate> findByVerificationToken(String token) {
        String sql = "SELECT * FROM certificates WHERE verification_token = :token";
        return jdbcClient.sql(sql)
                .param("token", token)
                .query(this::mapRow)
                .optional();
    }

    public Optional<Certificate> findByJobId(UUID jobId) {
        String sql = "SELECT * FROM certificates WHERE job_id = :jobId";
        return jdbcClient.sql(sql)
                .param("jobId", jobId)
                .query(this::mapRow)
                .optional();
    }

    public List<Certificate> findByEventId(UUID eventId, int limit, int offset) {
        String sql = """
            SELECT * FROM certificates
            WHERE event_id = :eventId
            ORDER BY created_at DESC
            LIMIT :limit OFFSET :offset
            """;

        return jdbcClient.sql(sql)
                .param("eventId", eventId)
                .param("limit", limit)
                .param("offset", offset)
                .query(this::mapRow)
                .list();
    }

    public void updateEmailStatus(UUID certificateId, EmailStatus emailStatus) {
        String sql = "UPDATE certificates SET email_status = :status, updated_at = CURRENT_TIMESTAMP WHERE id = :id";
        jdbcClient.sql(sql)
                .param("id", certificateId)
                .param("status", emailStatus.name())
                .update();
    }

    public String findLatestEmailError(UUID certificateId) {
        String sql = """
            SELECT error_message FROM email_delivery_attempts
            WHERE certificate_id = :id AND status = 'FAILED'
            ORDER BY attempted_at DESC LIMIT 1
            """;
        return jdbcClient.sql(sql)
                .param("id", certificateId)
                .query(String.class)
                .optional()
                .orElse(null);
    }

    public void revoke(UUID certificateId, String reason) {
        String sql = """
            UPDATE certificates
            SET status = 'REVOKED', revocation_reason = :reason, revoked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE id = :id
            """;

        jdbcClient.sql(sql)
                .param("id", certificateId)
                .param("reason", reason)
                .update();
    }

    public void linkReplacement(UUID oldCertId, UUID newCertId) {
        String sql = "UPDATE certificates SET status = 'REPLACED', replaced_by_id = :newId, updated_at = CURRENT_TIMESTAMP WHERE id = :oldId";
        jdbcClient.sql(sql)
                .param("oldId", oldCertId)
                .param("newId", newCertId)
                .update();
    }

    public Optional<CertificateDtos.PublicVerificationDto> getPublicVerificationDetails(String token) {
        String sql = """
            SELECT c.status, c.certificate_number, c.participant_name, e.name as event_name,
                   o.name as organization_name, c.issued_at, c.revocation_reason, c.revoked_at
            FROM certificates c
            JOIN events e ON c.event_id = e.id
            JOIN organizations o ON e.organization_id = o.id
            WHERE c.verification_token = :token
            """;

        return jdbcClient.sql(sql)
                .param("token", token)
                .query((rs, rowNum) -> {
                    CertificateStatus status = CertificateStatus.valueOf(rs.getString("status"));
                    boolean isValid = (status == CertificateStatus.VALID);
                    String message = switch (status) {
                        case VALID -> "Certificate is genuine, valid, and registered on CertFlow.";
                        case REVOKED -> "This certificate was REVOKED by the issuing organization.";
                        case REPLACED -> "This certificate has been REPLACED by an updated version.";
                    };

                    return CertificateDtos.PublicVerificationDto.builder()
                            .valid(isValid)
                            .status(status)
                            .certificateNumber(rs.getString("certificate_number"))
                            .participantName(rs.getString("participant_name"))
                            .eventName(rs.getString("event_name"))
                            .organizationName(rs.getString("organization_name"))
                            .issueDate(rs.getTimestamp("issued_at").toInstant())
                            .revocationReason(rs.getString("revocation_reason"))
                            .revokedAt(rs.getTimestamp("revoked_at") != null ? rs.getTimestamp("revoked_at").toInstant() : null)
                            .message(message)
                            .build();
                })
                .optional();
    }

    private Certificate mapRow(java.sql.ResultSet rs, int rowNum) throws java.sql.SQLException {
        return Certificate.builder()
                .id((UUID) rs.getObject("id"))
                .jobId((UUID) rs.getObject("job_id"))
                .eventId((UUID) rs.getObject("event_id"))
                .templateId((UUID) rs.getObject("template_id"))
                .templateVersion(rs.getInt("template_version"))
                .certificateNumber(rs.getString("certificate_number"))
                .verificationToken(rs.getString("verification_token"))
                .participantName(rs.getString("participant_name"))
                .recipientEmail(rs.getString("recipient_email"))
                .certificateType(rs.getString("certificate_type"))
                .pdfStorageKey(rs.getString("pdf_storage_key"))
                .status(CertificateStatus.valueOf(rs.getString("status")))
                .emailStatus(EmailStatus.valueOf(rs.getString("email_status")))
                .replacementForId((UUID) rs.getObject("replacement_for_id"))
                .replacedById((UUID) rs.getObject("replaced_by_id"))
                .revocationReason(rs.getString("revocation_reason"))
                .issuedAt(rs.getTimestamp("issued_at").toInstant())
                .revokedAt(rs.getTimestamp("revoked_at") != null ? rs.getTimestamp("revoked_at").toInstant() : null)
                .createdAt(rs.getTimestamp("created_at").toInstant())
                .updatedAt(rs.getTimestamp("updated_at").toInstant())
                .build();
    }
}
