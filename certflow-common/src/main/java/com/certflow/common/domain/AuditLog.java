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
public class AuditLog {
    private UUID id;
    private UUID organizationId;
    private UUID userId;
    private String action;
    private String resourceType;
    private UUID resourceId;
    private String detailsJson;
    private String ipAddress;
    private Instant createdAt;
}
