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
public class BatchParticipant {
    private UUID id;
    private UUID batchId;
    private int rowIndex;
    private String participantName;
    private String email;
    private String certificateType;
    private String customAttributesJson;
    private Instant createdAt;
}
