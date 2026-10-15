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
public class CertificateBatch {
    private UUID id;
    private UUID eventId;
    private UUID templateId;
    private String name;
    private int totalCount;
    private int generatedCount;
    private int emailSentCount;
    private int failedCount;
    private BatchStatus status;
    private Instant createdAt;
    private Instant updatedAt;
    private Instant completedAt;
}
