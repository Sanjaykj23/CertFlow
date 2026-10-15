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
public class CertificateJob {
    private UUID id;
    private UUID batchId;
    private UUID participantId;
    private JobStatus status;
    private int attemptCount;
    private String errorMessage;
    private ErrorCategory errorCategory;
    private Instant nextRetryAt;
    private String lockedBy;
    private Instant lockedAt;
    private Instant createdAt;
    private Instant updatedAt;
}
