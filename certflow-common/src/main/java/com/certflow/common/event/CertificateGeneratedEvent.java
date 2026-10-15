package com.certflow.common.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CertificateGeneratedEvent implements Serializable {
    private UUID certificateId;
    private UUID jobId;
    private UUID batchId;
    private UUID eventId;
    private String eventName;
    private String organizationName;
    private String participantName;
    private String recipientEmail;
    private String certificateNumber;
    private String verificationToken;
    private String verificationUrl;
    private String pdfStorageKey;
    private int attemptNumber;
}
