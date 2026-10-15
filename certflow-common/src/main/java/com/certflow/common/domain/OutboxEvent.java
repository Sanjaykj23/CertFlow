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
public class OutboxEvent {
    private UUID id;
    private String aggregateType;
    private UUID aggregateId;
    private String eventType;
    private String payloadJson;
    private OutboxStatus status;
    private int attemptCount;
    private String lastError;
    private Instant createdAt;
    private Instant publishedAt;
}
