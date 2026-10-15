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
public class CertificateTemplate {
    private UUID id;
    private UUID eventId;
    private String name;
    private String backgroundStorageKey;
    private String orientation;
    private int width;
    private int height;
    private String layoutJson; // serialized TemplateLayoutConfig
    private int version;
    private Instant createdAt;
    private Instant updatedAt;
}
