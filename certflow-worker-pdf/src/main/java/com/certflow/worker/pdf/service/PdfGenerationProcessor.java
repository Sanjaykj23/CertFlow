package com.certflow.worker.pdf.service;

import com.certflow.common.domain.*;
import com.certflow.common.event.CertificateGeneratedEvent;
import com.certflow.common.event.CertificateJobEvent;
import com.certflow.common.storage.StorageService;
import com.certflow.common.util.DefaultTemplateLayoutFactory;
import com.certflow.common.util.PdfBoxRenderer;
import com.certflow.common.util.QrCodeGenerator;
import com.certflow.common.util.TokenGenerator;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class PdfGenerationProcessor {

    private static final Logger log = LoggerFactory.getLogger(PdfGenerationProcessor.class);

    private final JdbcClient jdbcClient;
    private final StorageService storageService;
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;

    @Value("${certflow.worker.id:pdf-worker-1}")
    private String workerId;

    @Value("${certflow.s3.bucket-templates:certflow-templates}")
    private String templatesBucket;

    @Value("${certflow.s3.bucket-certificates:certflow-certificates}")
    private String certificatesBucket;

    @Value("${certflow.app.public-verify-url:http://localhost:5173/verify}")
    private String publicVerifyBaseUrl;

    public PdfGenerationProcessor(
            JdbcClient jdbcClient,
            StorageService storageService,
            KafkaTemplate<String, String> kafkaTemplate,
            ObjectMapper objectMapper
    ) {
        this.jdbcClient = jdbcClient;
        this.storageService = storageService;
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public void processCertificateJob(CertificateJobEvent jobEvent) {
        UUID jobId = jobEvent.getJobId();
        log.info("Worker [{}] attempting to claim job {}", workerId, jobId);

        // 1. Atomic job claim (distributed idempotency barrier)
        String claimSql = """
            UPDATE certificate_jobs
            SET status = 'PROCESSING', locked_by = :workerId, locked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE id = :jobId AND status IN ('PENDING', 'QUEUED')
            """;

        int claimed = jdbcClient.sql(claimSql)
                .param("workerId", workerId)
                .param("jobId", jobId)
                .update();

        if (claimed == 0) {
            log.info("Job {} was already claimed or completed by another worker. Skipping.", jobId);
            return;
        }

        try {
            // 2. Fetch Template configuration
            String templateSql = "SELECT layout_json, background_storage_key, version FROM certificate_templates WHERE id = :id";
            var templateRow = jdbcClient.sql(templateSql)
                    .param("id", jobEvent.getTemplateId())
                    .query((rs, rowNum) -> Map.of(
                            "layoutJson", rs.getString("layout_json"),
                            "bgKey", rs.getString("background_storage_key") != null ? rs.getString("background_storage_key") : "",
                            "version", rs.getInt("version")
                    ))
                    .optional();

            TemplateLayoutConfig layout = DefaultTemplateLayoutFactory.createDefaultLandscapeLayout();
            String bgKey = null;
            int templateVersion = 1;

            if (templateRow.isPresent()) {
                var row = templateRow.get();
                try {
                    layout = objectMapper.readValue((String) row.get("layoutJson"), TemplateLayoutConfig.class);
                } catch (Exception ex) {
                    log.warn("Could not parse template layout JSON, falling back to default layout");
                }
                bgKey = (String) row.get("bgKey");
                templateVersion = (int) row.get("version");
            }

            // 3. Download background if present
            byte[] bgBytes = null;
            if (bgKey != null && !bgKey.isBlank()) {
                try {
                    bgBytes = storageService.downloadFile(templatesBucket, bgKey);
                } catch (Exception ex) {
                    log.warn("Could not download template background image {}: {}", bgKey, ex.getMessage());
                }
            }

            // 4. Generate crypto verification token & certificate number
            String verificationToken = TokenGenerator.generateVerificationToken();
            String certificateNumber = TokenGenerator.generateCertificateNumber("CF");
            String verificationUrl = publicVerifyBaseUrl + "/" + verificationToken;

            // 5. Generate QR Code
            byte[] qrBytes = null;
            if (layout.getQrCode() != null && layout.getQrCode().isEnabled()) {
                qrBytes = QrCodeGenerator.generateQrCodePng(verificationUrl, 200, 200);
            }

            // 6. Map placeholders
            Map<String, String> placeholders = new HashMap<>();
            placeholders.put("participant_name", jobEvent.getParticipantName());
            placeholders.put("event_name", jobEvent.getEventName());
            placeholders.put("organization_name", jobEvent.getOrganizationName() != null ? jobEvent.getOrganizationName() : "CertFlow");
            placeholders.put("certificate_type", jobEvent.getCertificateType());
            placeholders.put("certificate_id", certificateNumber);
            placeholders.put("issue_date", jobEvent.getIssueDate() != null ? jobEvent.getIssueDate().toString() : Instant.now().toString());

            if (jobEvent.getCustomAttributes() != null) {
                placeholders.putAll(jobEvent.getCustomAttributes());
            }

            // 7. Render PDF with PDFBox
            byte[] pdfBytes = PdfBoxRenderer.renderCertificatePdf(layout, bgBytes, qrBytes, placeholders);

            // 8. Upload PDF to S3/MinIO
            String pdfKey = "certificates/" + jobEvent.getEventId() + "/" + certificateNumber + ".pdf";
            storageService.uploadFile(certificatesBucket, pdfKey, pdfBytes, "application/pdf");

            // 9. Persist Certificate record
            UUID certId = UUID.randomUUID();
            Instant now = Instant.now();

            String insertCertSql = """
                INSERT INTO certificates (
                    id, job_id, event_id, template_id, template_version, certificate_number,
                    verification_token, participant_name, recipient_email, certificate_type,
                    pdf_storage_key, status, email_status, issued_at, created_at, updated_at
                ) VALUES (
                    :id, :jobId, :eventId, :templateId, :templateVersion, :certNumber,
                    :token, :name, :email, :type,
                    :pdfKey, 'VALID', 'PENDING', :issuedAt, :createdAt, :updatedAt
                )
                """;

            jdbcClient.sql(insertCertSql)
                    .param("id", certId)
                    .param("jobId", jobId)
                    .param("eventId", jobEvent.getEventId())
                    .param("templateId", jobEvent.getTemplateId())
                    .param("templateVersion", templateVersion)
                    .param("certNumber", certificateNumber)
                    .param("token", verificationToken)
                    .param("name", jobEvent.getParticipantName())
                    .param("email", jobEvent.getRecipientEmail().toLowerCase())
                    .param("type", jobEvent.getCertificateType())
                    .param("pdfKey", pdfKey)
                    .param("issuedAt", Timestamp.from(now))
                    .param("createdAt", Timestamp.from(now))
                    .param("updatedAt", Timestamp.from(now))
                    .update();

            // 10. Update Job to GENERATED & increment batch counter
            jdbcClient.sql("UPDATE certificate_jobs SET status = 'GENERATED', updated_at = CURRENT_TIMESTAMP WHERE id = :jobId")
                    .param("jobId", jobId)
                    .update();

            jdbcClient.sql("UPDATE certificate_batches SET generated_count = generated_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = :batchId")
                    .param("batchId", jobEvent.getBatchId())
                    .update();

            // 11. Publish CertificateGeneratedEvent to Kafka
            CertificateGeneratedEvent generatedEvent = CertificateGeneratedEvent.builder()
                    .certificateId(certId)
                    .jobId(jobId)
                    .batchId(jobEvent.getBatchId())
                    .eventId(jobEvent.getEventId())
                    .eventName(jobEvent.getEventName())
                    .organizationName(jobEvent.getOrganizationName())
                    .participantName(jobEvent.getParticipantName())
                    .recipientEmail(jobEvent.getRecipientEmail())
                    .certificateNumber(certificateNumber)
                    .verificationToken(verificationToken)
                    .verificationUrl(verificationUrl)
                    .pdfStorageKey(pdfKey)
                    .attemptNumber(1)
                    .build();

            String generatedJson = objectMapper.writeValueAsString(generatedEvent);
            kafkaTemplate.send("certflow.certificate.generated", certId.toString(), generatedJson);

            log.info("Successfully generated certificate {} for participant {} and queued for email delivery",
                    certificateNumber, jobEvent.getRecipientEmail());

        } catch (Exception ex) {
            log.error("Failed to generate certificate for job {}: {}", jobId, ex.getMessage(), ex);

            ErrorCategory category = classifyError(ex);
            String failJobSql = """
                UPDATE certificate_jobs
                SET status = 'FAILED', error_message = :err, error_category = :cat, attempt_count = attempt_count + 1, updated_at = CURRENT_TIMESTAMP
                WHERE id = :jobId
                """;

            jdbcClient.sql(failJobSql)
                    .param("err", ex.getMessage() != null ? ex.getMessage() : "Unknown PDF rendering error")
                    .param("cat", category.name())
                    .param("jobId", jobId)
                    .update();

            jdbcClient.sql("UPDATE certificate_batches SET failed_count = failed_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = :batchId")
                    .param("batchId", jobEvent.getBatchId())
                    .update();
        }
    }

    private ErrorCategory classifyError(Exception ex) {
        if (ex instanceof IOException || ex.getMessage() != null && ex.getMessage().contains("Connection")) {
            return ErrorCategory.TRANSIENT;
        }
        return ErrorCategory.PERMANENT;
    }
}
