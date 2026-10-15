package com.certflow.api.service;

import com.certflow.api.repository.*;
import com.certflow.common.domain.*;
import com.certflow.common.storage.StorageService;
import com.certflow.common.util.PdfBoxRenderer;
import com.certflow.common.util.QrCodeGenerator;
import com.certflow.common.util.TokenGenerator;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;

import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import java.time.LocalDate;
import java.util.regex.Pattern;

@Service
@ConditionalOnProperty(name = "certflow.kafka.enabled", havingValue = "false")
public class LocalBatchProcessor {

    private static final Logger log = LoggerFactory.getLogger(LocalBatchProcessor.class);
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,63}$");

    private final CertificateJobRepository jobRepository;
    private final BatchParticipantRepository participantRepository;
    private final CertificateBatchRepository batchRepository;
    private final CertificateTemplateRepository templateRepository;
    private final EventRepository eventRepository;
    private final OrganizationRepository organizationRepository;
    private final CertificateRepository certificateRepository;
    private final StorageService storageService;
    private final ObjectMapper objectMapper;
    private final JavaMailSender mailSender;
    private final JdbcClient jdbcClient;

    @Value("${certflow.s3.bucket-certificates:certflow-certificates}")
    private String certificatesBucket;

    @Value("${certflow.s3.bucket-templates:certflow-templates}")
    private String templatesBucket;

    @Value("${certflow.app.public-verify-url:http://localhost:5173/verify}")
    private String publicVerifyBaseUrl;

    @Value("${certflow.email.from:no-reply@certflow.io}")
    private String fromEmail;

    @Value("${certflow.email.from-name:CertFlow Platform}")
    private String fromName;

    public LocalBatchProcessor(
            CertificateJobRepository jobRepository,
            BatchParticipantRepository participantRepository,
            CertificateBatchRepository batchRepository,
            CertificateTemplateRepository templateRepository,
            EventRepository eventRepository,
            OrganizationRepository organizationRepository,
            CertificateRepository certificateRepository,
            StorageService storageService,
            ObjectMapper objectMapper,
            @Autowired(required = false) JavaMailSender mailSender,
            JdbcClient jdbcClient
    ) {
        this.jobRepository = jobRepository;
        this.participantRepository = participantRepository;
        this.batchRepository = batchRepository;
        this.templateRepository = templateRepository;
        this.eventRepository = eventRepository;
        this.organizationRepository = organizationRepository;
        this.certificateRepository = certificateRepository;
        this.storageService = storageService;
        this.objectMapper = objectMapper;
        this.mailSender = mailSender;
        this.jdbcClient = jdbcClient;
    }

    @Scheduled(fixedDelay = 2000)
    public void processPendingJobs() {
        List<CertificateJob> queuedJobs = jobRepository.findQueuedJobs(10);
        if (queuedJobs.isEmpty()) {
            return;
        }

        for (CertificateJob job : queuedJobs) {
            try {
                processSingleJob(job);
            } catch (Exception ex) {
                log.error("Failed to process certificate job {}: {}", job.getId(), ex.getMessage(), ex);
                jobRepository.markFailed(job.getId(), ex.getMessage(), ErrorCategory.PERMANENT, null);
                batchRepository.incrementCounters(job.getBatchId(), 0, 0, 1);
            }
        }
    }

    private void processSingleJob(CertificateJob job) throws Exception {
        boolean claimed = jobRepository.claimJob(job.getId(), "local-worker-1");
        if (!claimed) {
            return;
        }

        CertificateBatch batch = batchRepository.findById(job.getBatchId())
                .orElseThrow(() -> new IllegalStateException("Batch not found: " + job.getBatchId()));

        BatchParticipant participant = participantRepository.findById(job.getParticipantId())
                .orElseThrow(() -> new IllegalStateException("Participant not found: " + job.getParticipantId()));

        Event event = eventRepository.findById(batch.getEventId())
                .orElseThrow(() -> new IllegalStateException("Event not found: " + batch.getEventId()));

        CertificateTemplate template = templateRepository.findById(batch.getTemplateId())
                .orElseThrow(() -> new IllegalStateException("Template not found: " + batch.getTemplateId()));

        // Parse layout
        TemplateLayoutConfig layout = new TemplateLayoutConfig();
        if (template.getLayoutJson() != null && !template.getLayoutJson().isBlank()) {
            try {
                layout = objectMapper.readValue(template.getLayoutJson(), TemplateLayoutConfig.class);
            } catch (Exception e) {
                log.warn("Failed to parse layoutJson, using default layout: {}", e.getMessage());
            }
        }

        // Background bytes if present
        byte[] bgBytes = null;
        if (template.getBackgroundStorageKey() != null && !template.getBackgroundStorageKey().isBlank()) {
            try {
                bgBytes = storageService.downloadFile(templatesBucket, template.getBackgroundStorageKey());
            } catch (Exception ignored) {}
        }

        // Identifiers
        String certNumber = TokenGenerator.generateCertificateNumber("CF");
        String token = TokenGenerator.generateVerificationToken();
        String verifyUrl = publicVerifyBaseUrl + "/" + token;

        // Generate QR code
        byte[] qrBytes = QrCodeGenerator.generateQrCodePng(verifyUrl, 150, 150);

        // Resolve Organization Name
        String orgName = "CertFlow Platform";
        try {
            Optional<Organization> orgOpt = organizationRepository.findById(event.getOrganizationId());
            if (orgOpt.isPresent()) {
                orgName = orgOpt.get().getName();
            }
        } catch (Exception ignored) {}

        // Complete Placeholders map
        Map<String, String> placeholders = new HashMap<>();
        placeholders.put("participant_name", participant.getParticipantName());
        placeholders.put("name", participant.getParticipantName());
        placeholders.put("full_name", participant.getParticipantName());
        placeholders.put("email", participant.getEmail());
        placeholders.put("recipient_email", participant.getEmail());
        placeholders.put("event_name", event.getName());
        placeholders.put("event", event.getName());
        placeholders.put("organization_name", orgName);
        placeholders.put("organization", orgName);
        placeholders.put("org_name", orgName);
        String dateStr = event.getEventDate() != null ? event.getEventDate().toString() : LocalDate.now().toString();
        placeholders.put("issue_date", dateStr);
        placeholders.put("date", dateStr);
        String certType = participant.getCertificateType() != null && !participant.getCertificateType().isBlank()
                ? participant.getCertificateType() : "Participant";
        placeholders.put("certificate_type", certType);
        placeholders.put("type", certType);
        placeholders.put("certificate_number", certNumber);
        placeholders.put("certificateNumber", certNumber);
        placeholders.put("certificate_id", certNumber);

        // Render PDF
        byte[] pdfBytes = PdfBoxRenderer.renderCertificatePdf(layout, bgBytes, qrBytes, placeholders);

        // Store PDF
        String storageKey = "certificates/" + batch.getId() + "/" + UUID.randomUUID() + ".pdf";
        storageService.uploadFile(certificatesBucket, storageKey, pdfBytes, "application/pdf");

        // Attempt SMTP email delivery if mail sender is available
        EmailStatus emailStatus = EmailStatus.PENDING;
        String emailError = null;

        String cleanEmail = participant.getEmail() != null ? participant.getEmail().trim() : "";
        boolean emailSyntaxValid = !cleanEmail.isEmpty() && EMAIL_PATTERN.matcher(cleanEmail).matches();

        if (mailSender != null) {
            if (!emailSyntaxValid) {
                emailStatus = EmailStatus.FAILED;
                emailError = "Invalid recipient email address format: '" + cleanEmail + "'";
                log.warn("Recipient email invalid for participant {}: {}", participant.getParticipantName(), cleanEmail);
            } else {
                try {
                    MimeMessage message = mailSender.createMimeMessage();
                    MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
                    helper.setFrom(fromEmail, fromName);
                    helper.setTo(cleanEmail);
                    helper.setSubject("Your Certificate for " + event.getName());

                    String html = "<div style=\"font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;\">"
                            + "<h2 style=\"color:#0f172a;margin-bottom:8px;\">Congratulations, " + participant.getParticipantName() + "!</h2>"
                            + "<p style=\"color:#475569;font-size:15px;line-height:1.5;\">Your official certificate for <strong>" + event.getName() + "</strong> has been issued by " + orgName + ".</p>"
                            + "<div style=\"background:#f8fafc;padding:12px 16px;border-radius:8px;margin:20px 0;border-left:4px solid #0284c7;\">"
                            + "<p style=\"margin:0;font-size:13px;color:#64748b;\">Certificate ID: <strong style=\"color:#0f172a;font-family:monospace;\">" + certNumber + "</strong></p>"
                            + "</div>"
                            + "<p style=\"margin:24px 0;\"><a href=\"" + verifyUrl + "\" style=\"display:inline-block;padding:10px 20px;background:#0284c7;color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;border-radius:6px;\">Verify Certificate Online</a></p>"
                            + "<p style=\"color:#94a3b8;font-size:12px;\">A printable PDF certificate is attached to this email.</p>"
                            + "</div>";

                    helper.setText(html, true);
                    helper.addAttachment("Certificate-" + certNumber + ".pdf", new ByteArrayResource(pdfBytes), "application/pdf");
                    mailSender.send(message);
                    emailStatus = EmailStatus.SENT;
                    log.info("Sent certificate email to {}", cleanEmail);
                } catch (Exception ex) {
                    emailStatus = EmailStatus.FAILED;
                    emailError = ex.getMessage() != null ? ex.getMessage() : "SMTP Delivery failure";
                    log.error("SMTP email delivery failed for {}: {}", cleanEmail, ex.getMessage());
                }
            }
        }

        // Save Certificate record
        Certificate cert = Certificate.builder()
                .jobId(job.getId())
                .eventId(event.getId())
                .templateId(template.getId())
                .templateVersion(template.getVersion())
                .certificateNumber(certNumber)
                .verificationToken(token)
                .participantName(participant.getParticipantName())
                .recipientEmail(cleanEmail)
                .certificateType(certType)
                .pdfStorageKey(storageKey)
                .status(CertificateStatus.VALID)
                .emailStatus(emailStatus)
                .issuedAt(Instant.now())
                .build();
        cert = certificateRepository.save(cert);

        // Record delivery attempt in email_delivery_attempts table
        if (emailStatus == EmailStatus.SENT || emailStatus == EmailStatus.FAILED) {
            UUID attemptId = UUID.randomUUID();
            String recordAttemptSql = """
                INSERT INTO email_delivery_attempts (id, certificate_id, attempt_number, status, error_message, error_category, attempted_at)
                VALUES (:id, :certId, 1, :status, :errMsg, :cat, CURRENT_TIMESTAMP)
                """;
            String cat = (emailError != null && (emailError.toLowerCase().contains("syntax") || emailError.toLowerCase().contains("format") || emailError.toLowerCase().contains("550") || emailError.toLowerCase().contains("invalid")))
                    ? "PERMANENT" : "TRANSIENT";
            jdbcClient.sql(recordAttemptSql)
                    .param("id", attemptId)
                    .param("certId", cert.getId())
                    .param("status", emailStatus.name())
                    .param("errMsg", emailError)
                    .param("cat", cat)
                    .update();
        }

        // Update Job Status and Batch Counters based on actual delivery result
        if (emailStatus == EmailStatus.FAILED) {
            jobRepository.markFailed(job.getId(), emailError, ErrorCategory.PERMANENT, null);
            // Increment: generated = 1, email_sent = 0, failed = 1
            batchRepository.incrementCounters(batch.getId(), 1, 0, 1);
        } else {
            jobRepository.markGenerated(job.getId());
            int sentDelta = (emailStatus == EmailStatus.SENT) ? 1 : 0;
            // Increment: generated = 1, email_sent = 1, failed = 0
            batchRepository.incrementCounters(batch.getId(), 1, sentDelta, 0);
        }

        // Update batch status if all done
        batchRepository.findById(batch.getId()).ifPresent(updatedBatch -> {
            if (updatedBatch.getGeneratedCount() + updatedBatch.getFailedCount() >= updatedBatch.getTotalCount()) {
                BatchStatus finalStatus = updatedBatch.getFailedCount() > 0
                        ? BatchStatus.PARTIALLY_FAILED
                        : BatchStatus.COMPLETED;
                batchRepository.updateStatus(updatedBatch.getId(), finalStatus);
                log.info("Batch {} finished with status {}. Generated: {}, Email Sent: {}, Failed: {}",
                        updatedBatch.getId(), finalStatus, updatedBatch.getGeneratedCount(),
                        updatedBatch.getEmailSentCount(), updatedBatch.getFailedCount());
            }
        });

        log.info("Locally generated certificate {} for participant {} ({})", certNumber, participant.getParticipantName(), participant.getEmail());
    }
}
