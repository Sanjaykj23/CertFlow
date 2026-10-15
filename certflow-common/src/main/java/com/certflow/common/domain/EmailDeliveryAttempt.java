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
public class EmailDeliveryAttempt {
    private UUID id;
    private UUID certificateId;
    private int attemptNumber;
    private String status; // SUCCESS, FAILED
    private String errorMessage;
    private ErrorCategory errorCategory;
    private Instant attemptedAt;
}
