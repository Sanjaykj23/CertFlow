package com.certflow.api.service;

import com.certflow.api.repository.AuditLogRepository;
import com.certflow.api.repository.CertificateRepository;
import com.certflow.api.repository.EventRepository;
import com.certflow.api.repository.OutboxEventRepository;
import com.certflow.common.domain.*;
import com.certflow.common.dto.CertificateDtos;
import com.certflow.common.event.CertificateGeneratedEvent;
import com.certflow.common.storage.StorageService;
import com.certflow.common.util.TokenGenerator;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class CertificateService {

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,63}$");

    private final CertificateRepository certificateRepository;
    private final EventRepository eventRepository;
    private final OutboxEventRepository outboxEventRepository;
    private final AuditLogRepository auditLogRepository;
    private final OrganizationService organizationService;
    private final StorageService storageService;
    private final RedisTemplate<String, Object> redisTemplate;
    private final ObjectMapper objectMapper;
    private final JavaMailSender mailSender;
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final JdbcClient jdbcClient;

    @Value("${certflow.s3.bucket-certificates:certflow-certificates}")
    private String certificatesBucket;

    @Value("${certflow.app.public-verify-url:http://localhost:5173/verify}")
    private String publicVerifyBaseUrl;

    @Value("${certflow.email.from:no-reply@certflow.io}")
    private String fromEmail;

    @Value("${certflow.email.from-name:CertFlow Platform}")
    private String fromName;

    public CertificateService(
            CertificateRepository certificateRepository,
            EventRepository eventRepository,
            OutboxEventRepository outboxEventRepository,
            AuditLogRepository auditLogRepository,
            OrganizationService organizationService,
            StorageService storageService,
            @Autowired(required = false) RedisTemplate<String, Object> redisTemplate,
            ObjectMapper objectMapper,
            @Autowired(required = false) JavaMailSender mailSender,
            @Autowired(required = false) KafkaTemplate<String, String> kafkaTemplate,
            JdbcClient jdbcClient
    ) {
        this.certificateRepository = certificateRepository;
        this.eventRepository = eventRepository;
        this.outboxEventRepository = outboxEventRepository;
        this.auditLogRepository = auditLogRepository;
        this.organizationService = organizationService;
        this.storageService = storageService;
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
        this.mailSender = mailSender;
        this.kafkaTemplate = kafkaTemplate;
        this.jdbcClient = jdbcClient;
    }

    public CertificateDtos.CertificateDto getCertificate(UUID certificateId, UUID userId) {
        Certificate cert = certificateRepository.findById(certificateId)
                .orElseThrow(() -> new IllegalArgumentException("Certificate not found"));
        Event event = eventRepository.findById(cert.getEventId())
                .orElseThrow(() -> new IllegalArgumentException("Event not found"));
        organizationService.verifyMembership(event.getOrganizationId(), userId, UserRole.VIEWER);

        return toDto(cert, event.getName());
    }

    public List<CertificateDtos.CertificateDto> getEventCertificates(UUID eventId, UUID userId, int page, int size) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event not found"));
        organizationService.verifyMembership(event.getOrganizationId(), userId, UserRole.VIEWER);

        int offset = Math.max(0, page) * Math.max(1, size);
        return certificateRepository.findByEventId(eventId, size, offset).stream()
                .map(c -> toDto(c, event.getName()))
                .toList();
    }

    public byte[] getCertificatePdfBytes(UUID certificateId) {
        Certificate cert = certificateRepository.findById(certificateId)
                .orElseThrow(() -> new IllegalArgumentException("Certificate not found"));

        if (cert.getPdfStorageKey() == null) {
            throw new IllegalStateException("Certificate PDF has not been generated yet");
        }

        return storageService.downloadFile(certificatesBucket, cert.getPdfStorageKey());
    }

    @Transactional
    public void revokeCertificate(UUID certificateId, UUID userId, String reason) {
        Certificate cert = certificateRepository.findById(certificateId)
                .orElseThrow(() -> new IllegalArgumentException("Certificate not found"));
        Event event = eventRepository.findById(cert.getEventId())
                .orElseThrow(() -> new IllegalArgumentException("Event not found"));
        organizationService.verifyMembership(event.getOrganizationId(), userId, UserRole.ADMIN);

        certificateRepository.revoke(certificateId, reason);

        // Instant Distributed Cache Invalidation: evict verification cache key
        try {
            if (redisTemplate != null) {
                redisTemplate.delete("cert:verify:" + cert.getVerificationToken());
            }
        } catch (Exception ignored) {}

        // Audit Logging
        auditLogRepository.save(AuditLog.builder()
                .organizationId(event.getOrganizationId())
                .userId(userId)
                .action("CERTIFICATE_REVOKED")
                .resourceType("Certificate")
                .resourceId(certificateId)
                .detailsJson("{\"reason\":\"" + reason.replace("\"", "\\\"") + "\"}")
                .build());
    }

    @Transactional
    public CertificateDtos.CertificateDto replaceCertificate(
            UUID certificateId,
            UUID userId,
            CertificateDtos.ReplaceCertificateRequest request
    ) {
        Certificate oldCert = certificateRepository.findById(certificateId)
                .orElseThrow(() -> new IllegalArgumentException("Certificate not found"));
        Event event = eventRepository.findById(oldCert.getEventId())
                .orElseThrow(() -> new IllegalArgumentException("Event not found"));
        organizationService.verifyMembership(event.getOrganizationId(), userId, UserRole.ADMIN);

        String newCertNum = TokenGenerator.generateCertificateNumber("CF");
        String newToken = TokenGenerator.generateVerificationToken();

        String participantName = (request.getUpdatedParticipantName() != null && !request.getUpdatedParticipantName().isBlank())
                ? request.getUpdatedParticipantName().trim() : oldCert.getParticipantName();
        String recipientEmail = (request.getUpdatedEmail() != null && !request.getUpdatedEmail().isBlank())
                ? request.getUpdatedEmail().trim().toLowerCase(Locale.ROOT) : oldCert.getRecipientEmail();
        String certType = (request.getUpdatedCertificateType() != null && !request.getUpdatedCertificateType().isBlank())
                ? request.getUpdatedCertificateType().trim() : oldCert.getCertificateType();

        Certificate replacementCert = Certificate.builder()
                .eventId(oldCert.getEventId())
                .templateId(oldCert.getTemplateId())
                .templateVersion(oldCert.getTemplateVersion())
                .certificateNumber(newCertNum)
                .verificationToken(newToken)
                .participantName(participantName)
                .recipientEmail(recipientEmail)
                .certificateType(certType)
                .status(CertificateStatus.VALID)
                .emailStatus(EmailStatus.PENDING)
                .replacementForId(oldCert.getId())
                .issuedAt(Instant.now())
                .build();
        replacementCert = certificateRepository.save(replacementCert);

        // Mark old certificate replaced and link records
        certificateRepository.linkReplacement(oldCert.getId(), replacementCert.getId());

        // Invalidate old token from cache
        try {
            if (redisTemplate != null) {
                redisTemplate.delete("cert:verify:" + oldCert.getVerificationToken());
            }
        } catch (Exception ignored) {}

        // Audit Logging
        auditLogRepository.save(AuditLog.builder()
                .organizationId(event.getOrganizationId())
                .userId(userId)
                .action("CERTIFICATE_REPLACED")
                .resourceType("Certificate")
                .resourceId(replacementCert.getId())
                .detailsJson("{\"oldCertificateId\":\"" + oldCert.getId() + "\",\"reason\":\"" + request.getReason().replace("\"", "\\\"") + "\"}")
                .build());

        return toDto(replacementCert, event.getName());
    }

    // The local SMTP path records FAILED status/attempts and then throws to report the error:
    // those writes must survive, so do not roll back on the exceptions it throws.
    @Transactional(noRollbackFor = {IllegalArgumentException.class, IllegalStateException.class})
    public void resendEmail(UUID certificateId, UUID userId) {
        Certificate cert = certificateRepository.findById(certificateId)
                .orElseThrow(() -> new IllegalArgumentException("Certificate not found"));
        Event event = eventRepository.findById(cert.getEventId())
                .orElseThrow(() -> new IllegalArgumentException("Event not found"));
        organizationService.verifyMembership(event.getOrganizationId(), userId, UserRole.OPERATOR);

        // If running in local zero-docker mode (no kafka) and mailSender configured: deliver directly!
        if (kafkaTemplate == null && mailSender != null) {
            String recipientEmail = cert.getRecipientEmail() != null ? cert.getRecipientEmail().trim() : "";
            if (recipientEmail.isEmpty() || !EMAIL_PATTERN.matcher(recipientEmail).matches()) {
                certificateRepository.updateEmailStatus(cert.getId(), EmailStatus.FAILED);
                recordDeliveryAttempt(cert.getId(), "FAILED", "Invalid recipient email address format: '" + recipientEmail + "'", "PERMANENT");
                throw new IllegalArgumentException("Invalid recipient email address format: '" + recipientEmail + "'");
            }

            try {
                byte[] pdfBytes = storageService.downloadFile(certificatesBucket, cert.getPdfStorageKey());
                MimeMessage message = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
                helper.setFrom(fromEmail, fromName);
                helper.setTo(recipientEmail);
                helper.setSubject("Your Certificate for " + event.getName());

                String verifyUrl = publicVerifyBaseUrl + "/" + cert.getVerificationToken();
                String html = "<div style=\"font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;\">"
                        + "<h2 style=\"color:#0f172a;margin-bottom:8px;\">Congratulations, " + cert.getParticipantName() + "!</h2>"
                        + "<p style=\"color:#475569;font-size:15px;line-height:1.5;\">Your official certificate for <strong>" + event.getName() + "</strong> has been re-delivered.</p>"
                        + "<div style=\"background:#f8fafc;padding:12px 16px;border-radius:8px;margin:20px 0;border-left:4px solid #0284c7;\">"
                        + "<p style=\"margin:0;font-size:13px;color:#64748b;\">Certificate ID: <strong style=\"color:#0f172a;font-family:monospace;\">" + cert.getCertificateNumber() + "</strong></p>"
                        + "</div>"
                        + "<p style=\"margin:24px 0;\"><a href=\"" + verifyUrl + "\" style=\"display:inline-block;padding:10px 20px;background:#0284c7;color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;border-radius:6px;\">Verify Certificate Online</a></p>"
                        + "<p style=\"color:#94a3b8;font-size:12px;\">A printable PDF certificate is attached to this email.</p>"
                        + "</div>";

                helper.setText(html, true);
                helper.addAttachment("Certificate-" + cert.getCertificateNumber() + ".pdf", new ByteArrayResource(pdfBytes), "application/pdf");
                mailSender.send(message);

                certificateRepository.updateEmailStatus(cert.getId(), EmailStatus.SENT);
                recordDeliveryAttempt(cert.getId(), "SENT", null, null);
                return;
            } catch (Exception ex) {
                certificateRepository.updateEmailStatus(cert.getId(), EmailStatus.FAILED);
                String cat = (ex.getMessage() != null && (ex.getMessage().contains("550") || ex.getMessage().contains("Invalid"))) ? "PERMANENT" : "TRANSIENT";
                recordDeliveryAttempt(cert.getId(), "FAILED", ex.getMessage(), cat);
                throw new IllegalStateException("Email delivery failed: " + ex.getMessage());
            }
        }

        // Kafka-backed distributed flow
        CertificateGeneratedEvent eventPayload = CertificateGeneratedEvent.builder()
                .certificateId(cert.getId())
                .jobId(cert.getJobId())
                .eventId(event.getId())
                .eventName(event.getName())
                .organizationName("CertFlow")
                .participantName(cert.getParticipantName())
                .recipientEmail(cert.getRecipientEmail())
                .certificateNumber(cert.getCertificateNumber())
                .verificationToken(cert.getVerificationToken())
                .verificationUrl(publicVerifyBaseUrl + "/" + cert.getVerificationToken())
                .pdfStorageKey(cert.getPdfStorageKey())
                .attemptNumber(1)
                .build();

        try {
            String payloadJson = objectMapper.writeValueAsString(eventPayload);
            outboxEventRepository.save(OutboxEvent.builder()
                    .aggregateType("CERTIFICATE_GENERATED")
                    .aggregateId(cert.getId())
                    .eventType("CertificateGeneratedEvent")
                    .payloadJson(payloadJson)
                    .status(OutboxStatus.PENDING)
                    .build());
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to serialize resend event", e);
        }
    }

    private void recordDeliveryAttempt(UUID certId, String status, String errorMsg, String category) {
        try {
            String sql = """
                INSERT INTO email_delivery_attempts (id, certificate_id, attempt_number, status, error_message, error_category, attempted_at)
                VALUES (:id, :certId, (SELECT COALESCE(MAX(attempt_number), 0) + 1 FROM email_delivery_attempts WHERE certificate_id = :certId), :status, :errMsg, :cat, CURRENT_TIMESTAMP)
                """;
            jdbcClient.sql(sql)
                    .param("id", UUID.randomUUID())
                    .param("certId", certId)
                    .param("status", status)
                    .param("errMsg", errorMsg)
                    .param("cat", category)
                    .update();
        } catch (Exception ignored) {}
    }

    private CertificateDtos.CertificateDto toDto(Certificate cert, String eventName) {
        String emailError = null;
        if (cert.getEmailStatus() == EmailStatus.FAILED) {
            emailError = certificateRepository.findLatestEmailError(cert.getId());
        }

        return CertificateDtos.CertificateDto.builder()
                .id(cert.getId())
                .jobId(cert.getJobId())
                .eventId(cert.getEventId())
                .templateId(cert.getTemplateId())
                .eventName(eventName)
                .certificateNumber(cert.getCertificateNumber())
                .verificationToken(cert.getVerificationToken())
                .participantName(cert.getParticipantName())
                .recipientEmail(cert.getRecipientEmail())
                .certificateType(cert.getCertificateType())
                .pdfStorageKey(cert.getPdfStorageKey())
                .status(cert.getStatus())
                .emailStatus(cert.getEmailStatus())
                .emailErrorMessage(emailError)
                .replacementForId(cert.getReplacementForId())
                .replacedById(cert.getReplacedById())
                .revocationReason(cert.getRevocationReason())
                .issuedAt(cert.getIssuedAt())
                .revokedAt(cert.getRevokedAt())
                .createdAt(cert.getCreatedAt())
                .build();
    }
}
