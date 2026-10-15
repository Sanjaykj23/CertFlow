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
public class OrganizationMember {
    private UUID id;
    private UUID organizationId;
    private UUID userId;
    private UserRole role;
    private Instant createdAt;
}
