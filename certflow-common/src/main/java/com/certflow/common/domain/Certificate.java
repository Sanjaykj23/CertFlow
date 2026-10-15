package com.certflow.common.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Certificate {
    private UUID id;
    private UUID jobId;
    private UUID eventId;
    private UUID templateId;
    private int templateVersion;
    private String certificateNumber;
    private String verificationToken;
    private String participantName;
    private String recipientEmail;
    private String certificateType;
    private String pdfStorageKey;
    private CertificateStatus status;
    private EmailStatus emailStatus;
    private UUID replacementForId;
    private UUID replacedById;
    private String revocationReason;
    private Instant issuedAt;
    private Instant revokedAt;
    private Instant createdAt;
    private Instant updatedAt;
}
