package com.certflow.worker.email.service;

import com.certflow.common.domain.ErrorCategory;
import com.certflow.common.event.CertificateGeneratedEvent;
import com.certflow.common.storage.StorageService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;

@Service
public class EmailDeliveryProcessor {

    private static final Logger log = LoggerFactory.getLogger(EmailDeliveryProcessor.class);

    private final JavaMailSender mailSender;
    private final StorageService storageService;
    private final JdbcClient jdbcClient;
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;

    @Value("${certflow.email.from:no-reply@certflow.io}")
    private String fromEmail;

    @Value("${certflow.email.from-name:CertFlow Platform}")
    private String fromName;

    @Value("${certflow.email.max-retries:5}")
    private int maxRetries;

    @Value("${certflow.s3.bucket-certificates:certflow-certificates}")
    private String certificatesBucket;

    public EmailDeliveryProcessor(
            JavaMailSender mailSender,
            StorageService storageService,
            JdbcClient jdbcClient,
            KafkaTemplate<String, String> kafkaTemplate,
            ObjectMapper objectMapper
    ) {
        this.mailSender = mailSender;
        this.storageService = storageService;
        this.jdbcClient = jdbcClient;
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public void processEmailDelivery(CertificateGeneratedEvent event) {
        UUID certId = event.getCertificateId();
        int attempt = event.getAttemptNumber();
        log.info("Sending certificate email attempt {} for certificate {} to {}",
                attempt, event.getCertificateNumber(), event.getRecipientEmail());

        try {
            // 1. Download certificate PDF binary from MinIO / S3
            byte[] pdfBytes = storageService.downloadFile(certificatesBucket, event.getPdfStorageKey());

            // 2. Build personalized HTML message
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail, fromName);
            helper.setTo(event.getRecipientEmail());
            helper.setSubject("Your Certificate for " + event.getEventName());

            String orgName = event.getOrganizationName() != null ? event.getOrganizationName() : "CertFlow Platform";
            String htmlContent = buildHtmlBody(
                    event.getParticipantName(),
                    event.getEventName(),
                    orgName,
                    event.getCertificateNumber(),
                    event.getVerificationUrl()
            );

            helper.setText(htmlContent, true);

            // Attach PDF
            String filename = "Certificate-" + event.getCertificateNumber() + ".pdf";
            helper.addAttachment(filename, new ByteArrayResource(pdfBytes), "application/pdf");

            // 3. Deliver email via SMTP
            mailSender.send(message);

            // 4. Record successful delivery attempt
            UUID attemptId = UUID.randomUUID();
            String recordAttemptSql = """
                INSERT INTO email_delivery_attempts (id, certificate_id, attempt_number, status, attempted_at)
                VALUES (:id, :certId, :attemptNum, 'SUCCESS', CURRENT_TIMESTAMP)
                """;

            jdbcClient.sql(recordAttemptSql)
                    .param("id", attemptId)
                    .param("certId", certId)
                    .param("attemptNum", attempt)
                    .update();

            // 5. Update certificate email_status = SENT
            jdbcClient.sql("UPDATE certificates SET email_status = 'SENT', updated_at = CURRENT_TIMESTAMP WHERE id = :id")
                    .param("id", certId)
                    .update();

            // 6. Increment batch email_sent_count & evaluate completion
            jdbcClient.sql("UPDATE certificate_batches SET email_sent_count = email_sent_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = :batchId")
                    .param("batchId", event.getBatchId())
                    .update();

            checkBatchCompletion(event.getBatchId());

            log.info("Successfully delivered certificate email to {}", event.getRecipientEmail());

        } catch (Exception ex) {
            log.error("Failed to deliver certificate email to {} (attempt {}): {}",
                    event.getRecipientEmail(), attempt, ex.getMessage(), ex);

            ErrorCategory category = classifyEmailError(ex);

            // Record failed attempt
            String recordAttemptSql = """
                INSERT INTO email_delivery_attempts (id, certificate_id, attempt_number, status, error_message, error_category, attempted_at)
                VALUES (:id, :certId, :attemptNum, 'FAILED', :errMsg, :cat, CURRENT_TIMESTAMP)
                """;

            jdbcClient.sql(recordAttemptSql)
                    .param("id", UUID.randomUUID())
                    .param("certId", certId)
                    .param("attemptNum", attempt)
                    .param("errMsg", ex.getMessage() != null ? ex.getMessage() : "SMTP Delivery failure")
                    .param("cat", category.name())
                    .update();

            if (category == ErrorCategory.TRANSIENT && attempt < maxRetries) {
                // Mark RETRY_WAIT
                jdbcClient.sql("UPDATE certificates SET email_status = 'RETRY_WAIT', updated_at = CURRENT_TIMESTAMP WHERE id = :id")
                        .param("id", certId)
                        .update();
            } else {
                // Permanent failure or retry exhausted -> Mark FAILED and forward to DLQ
                jdbcClient.sql("UPDATE certificates SET email_status = 'FAILED', updated_at = CURRENT_TIMESTAMP WHERE id = :id")
                        .param("id", certId)
                        .update();

                try {
                    String eventJson = objectMapper.writeValueAsString(event);
                    kafkaTemplate.send("certflow.dlq", certId.toString(), eventJson);
                    log.warn("Exhausted retries for certificate {}. Routed to Dead-Letter Queue (certflow.dlq)", certId);
                } catch (Exception dlqEx) {
                    log.error("Failed to publish to DLQ: {}", dlqEx.getMessage());
                }
            }
        }
    }

    private void checkBatchCompletion(UUID batchId) {
        String checkSql = """
            UPDATE certificate_batches
            SET status = 'COMPLETED', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE id = :batchId
              AND (generated_count + failed_count) >= total_count
              AND (email_sent_count + failed_count) >= total_count
            """;

        jdbcClient.sql(checkSql).param("batchId", batchId).update();
    }

    private ErrorCategory classifyEmailError(Exception ex) {
        String msg = ex.getMessage() != null ? ex.getMessage().toLowerCase() : "";
        if (msg.contains("syntax") || msg.contains("invalid address") || msg.contains("550") || msg.contains("501")) {
            return ErrorCategory.PERMANENT;
        }
        return ErrorCategory.TRANSIENT;
    }

    private String buildHtmlBody(String name, String eventName, String orgName, String certNumber, String verifyUrl) {
        return """
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
                .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
                .badge { display: inline-block; background: #dbeafe; color: #1e40af; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 9999px; margin-bottom: 16px; }
                h1 { font-size: 24px; color: #0f172a; margin-top: 0; }
                p { font-size: 15px; line-height: 1.6; color: #475569; }
                .btn { display: inline-block; background: #2563eb; color: #ffffff !important; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 8px; margin: 20px 0; }
                .footer { font-size: 13px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 24px; }
              </style>
            </head>
            <body>
              <div class="card">
                <span class="badge">Official Certificate</span>
                <h1>Congratulations, %s!</h1>
                <p>We are delighted to present your official certificate of participation for <strong>%s</strong>.</p>
                <p>Your personalized PDF certificate is attached to this email.</p>
                <p>You can also verify your certificate's authenticity online at any time:</p>
                <p><a href="%s" class="btn">View & Verify Online</a></p>
                <p><strong>Certificate ID:</strong> <code>%s</code></p>
                <div class="footer">
                  <p>Warm regards,<br><strong>%s</strong> via CertFlow</p>
                </div>
              </div>
            </body>
            </html>
            """.formatted(name, eventName, verifyUrl, certNumber, orgName);
    }
}
