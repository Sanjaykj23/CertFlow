package com.certflow.common.dto;

import com.certflow.common.domain.BatchStatus;
import com.certflow.common.domain.EmailStatus;
import com.certflow.common.domain.JobStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public class BatchDtos {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateBatchRequest {
        @NotBlank(message = "Batch name is required")
        private String name;

        @NotNull(message = "Template ID is required")
        private UUID templateId;

        @NotNull(message = "Participants list is required")
        private List<ParticipantInput> participants;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ParticipantInput {
        private String participantName;
        private String email;
        private String certificateType;
        private String customAttributesJson;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BatchDto {
        private UUID id;
        private UUID eventId;
        private UUID templateId;
        private String templateName;
        private String name;
        private int totalCount;
        private int generatedCount;
        private int emailSentCount;
        private int failedCount;
        private BatchStatus status;
        private Instant createdAt;
        private Instant completedAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BatchProgressDto {
        private UUID batchId;
        private String batchName;
        private BatchStatus status;
        private int totalParticipants;
        private int certificatesPending;
        private int certificatesGenerated;
        private int emailsPending;
        private int emailsSent;
        private int failedJobs;
        private double progressPercentage;
        private List<BatchJobSummaryDto> recentFailures;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BatchJobSummaryDto {
        private UUID jobId;
        private String participantName;
        private String email;
        private JobStatus status;
        private EmailStatus emailStatus;
        private int attemptCount;
        private String errorMessage;
        private Instant updatedAt;
    }
}
