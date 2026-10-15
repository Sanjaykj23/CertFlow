package com.certflow.common.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public class EventDtos {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateEventRequest {
        @NotNull(message = "Organization ID is required")
        private UUID organizationId;

        @NotBlank(message = "Event name is required")
        private String name;

        private String description;

        @NotNull(message = "Event date is required")
        private LocalDate eventDate;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateEventRequest {
        @NotBlank(message = "Event name is required")
        private String name;

        private String description;

        @NotNull(message = "Event date is required")
        private LocalDate eventDate;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EventDto {
        private UUID id;
        private UUID organizationId;
        private String name;
        private String description;
        private LocalDate eventDate;
        private boolean archived;
        private int batchCount;
        private int certificateCount;
        private Instant createdAt;
        private Instant updatedAt;
    }
}
