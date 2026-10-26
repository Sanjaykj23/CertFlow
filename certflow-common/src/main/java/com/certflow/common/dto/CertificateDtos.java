package com.certflow.common.dto;

import com.certflow.common.domain.CertificateStatus;
import com.certflow.common.domain.EmailStatus;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

public class CertificateDtos {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CertificateDto {
        private UUID id;
        private UUID jobId;
        private UUID eventId;
        private UUID templateId;
        private String eventName;
        private String certificateNumber;
        private String verificationToken;
        private String participantName;
        private String recipientEmail;
        private String certificateType;
        private String pdfStorageKey;
        private CertificateStatus status;
        private EmailStatus emailStatus;
        private String emailErrorMessage;
        private UUID replacementForId;
        private UUID replacedById;
        private String revocationReason;
        private Instant issuedAt;
        private Instant revokedAt;
        private Instant createdAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RevokeCertificateRequest {
        @NotBlank(message = "Revocation reason is required")
        private String reason;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReplaceCertificateRequest {
        private String updatedParticipantName;
        private String updatedEmail;
        private String updatedCertificateType;
        @NotBlank(message = "Reason for replacement is required")
        private String reason;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PublicVerificationDto {
        private boolean valid;
        private CertificateStatus status; // VALID, REVOKED, REPLACED
        private String certificateNumber;
        private String participantName;
        private String eventName;
        private String organizationName;
        private Instant issueDate;
        private String revocationReason;
        private Instant revokedAt;
        private String message;
    }
}
