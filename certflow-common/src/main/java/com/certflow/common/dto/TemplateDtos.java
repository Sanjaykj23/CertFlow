package com.certflow.common.dto;

import com.certflow.common.domain.TemplateLayoutConfig;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

public class TemplateDtos {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SaveTemplateRequest {
        @NotBlank(message = "Template name is required")
        private String name;

        private String backgroundStorageKey;

        @Builder.Default
        private String orientation = "LANDSCAPE";

        @Builder.Default
        private int width = 842;

        @Builder.Default
        private int height = 595;

        @NotNull(message = "Layout configuration is required")
        private TemplateLayoutConfig layoutConfig;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TemplateDto {
        private UUID id;
        private UUID eventId;
        private String name;
        private String backgroundStorageKey;
        private String orientation;
        private int width;
        private int height;
        private TemplateLayoutConfig layoutConfig;
        private int version;
        private Instant createdAt;
        private Instant updatedAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PreviewTemplateRequest {
        private TemplateLayoutConfig layoutConfig;
        private String backgroundStorageKey;
        private String sampleParticipantName;
        private String sampleEventName;
        private String sampleCertificateType;
        private String sampleOrganizationName;
    }
}
