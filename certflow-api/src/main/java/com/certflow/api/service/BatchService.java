package com.certflow.api.service;

import com.certflow.api.repository.*;
import com.certflow.common.domain.*;
import com.certflow.common.dto.BatchDtos;
import com.certflow.common.event.CertificateJobEvent;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class BatchService {

    private final CertificateBatchRepository batchRepository;
    private final BatchParticipantRepository participantRepository;
    private final CertificateJobRepository jobRepository;
    private final OutboxEventRepository outboxEventRepository;
    private final EventRepository eventRepository;
    private final OrganizationRepository organizationRepository;
    private final OrganizationService organizationService;
    private final ObjectMapper objectMapper;

    public BatchService(
            CertificateBatchRepository batchRepository,
            BatchParticipantRepository participantRepository,
            CertificateJobRepository jobRepository,
            OutboxEventRepository outboxEventRepository,
            EventRepository eventRepository,
            OrganizationRepository organizationRepository,
            OrganizationService organizationService,
            ObjectMapper objectMapper
    ) {
        this.batchRepository = batchRepository;
        this.participantRepository = participantRepository;
        this.jobRepository = jobRepository;
        this.outboxEventRepository = outboxEventRepository;
        this.eventRepository = eventRepository;
        this.organizationRepository = organizationRepository;
        this.organizationService = organizationService;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public BatchDtos.BatchDto createBatch(UUID eventId, UUID userId, BatchDtos.CreateBatchRequest request) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event not found"));
        organizationService.verifyMembership(event.getOrganizationId(), userId, UserRole.OPERATOR);

        if (request.getParticipants() == null || request.getParticipants().isEmpty()) {
            throw new IllegalArgumentException("Batch must have at least one participant");
        }

        CertificateBatch batch = CertificateBatch.builder()
                .eventId(eventId)
                .templateId(request.getTemplateId())
                .name(request.getName().trim())
                .totalCount(request.getParticipants().size())
                .generatedCount(0)
                .emailSentCount(0)
                .failedCount(0)
                .status(BatchStatus.DRAFT)
                .build();
        batch = batchRepository.save(batch);

        List<BatchParticipant> participants = new ArrayList<>();
        int rowIndex = 1;
        for (BatchDtos.ParticipantInput p : request.getParticipants()) {
            participants.add(BatchParticipant.builder()
                    .batchId(batch.getId())
                    .rowIndex(rowIndex++)
                    .participantName(p.getParticipantName().trim())
                    .email(p.getEmail().trim().toLowerCase(Locale.ROOT))
                    .certificateType(p.getCertificateType() != null && !p.getCertificateType().isBlank()
                            ? p.getCertificateType().trim() : "Participant")
                    .customAttributesJson(p.getCustomAttributesJson())
                    .build());
        }

        participantRepository.saveAll(participants);

        return toDto(batch);
    }

    @Transactional
    public BatchDtos.BatchDto startBatch(UUID batchId, UUID userId) {
        CertificateBatch batch = batchRepository.findById(batchId)
                .orElseThrow(() -> new IllegalArgumentException("Batch not found"));
        Event event = eventRepository.findById(batch.getEventId())
                .orElseThrow(() -> new IllegalArgumentException("Event not found"));
        Organization org = organizationRepository.findById(event.getOrganizationId())
                .orElseThrow(() -> new IllegalArgumentException("Organization not found"));
        organizationService.verifyMembership(event.getOrganizationId(), userId, UserRole.OPERATOR);

        if (batch.getStatus() == BatchStatus.PROCESSING || batch.getStatus() == BatchStatus.COMPLETED) {
            throw new IllegalStateException("Batch is already " + batch.getStatus());
        }

        List<BatchParticipant> participants = participantRepository.findByBatchId(batchId);
        List<CertificateJob> jobs = new ArrayList<>();
        List<OutboxEvent> outboxEvents = new ArrayList<>();

        for (BatchParticipant participant : participants) {
            UUID jobId = UUID.randomUUID();

            CertificateJob job = CertificateJob.builder()
                    .id(jobId)
                    .batchId(batchId)
                    .participantId(participant.getId())
                    .status(JobStatus.QUEUED)
                    .attemptCount(0)
                    .build();
            jobs.add(job);

            CertificateJobEvent eventPayload = CertificateJobEvent.builder()
                    .jobId(jobId)
                    .batchId(batchId)
                    .eventId(event.getId())
                    .templateId(batch.getTemplateId())
                    .participantId(participant.getId())
                    .participantName(participant.getParticipantName())
                    .recipientEmail(participant.getEmail())
                    .certificateType(participant.getCertificateType())
                    .eventName(event.getName())
                    .organizationName(org.getName())
                    .issueDate(event.getEventDate())
                    .attemptNumber(1)
                    .build();

            try {
                String payloadJson = objectMapper.writeValueAsString(eventPayload);
                OutboxEvent outboxEvent = OutboxEvent.builder()
                        .id(UUID.randomUUID())
                        .aggregateType("CERTIFICATE_JOB")
                        .aggregateId(jobId)
                        .eventType("CertificateJobEvent")
                        .payloadJson(payloadJson)
                        .status(OutboxStatus.PENDING)
                        .attemptCount(0)
                        .build();
                outboxEvents.add(outboxEvent);
            } catch (JsonProcessingException e) {
                throw new RuntimeException("Failed to serialize CertificateJobEvent", e);
            }
        }

        // Transactional Outbox guarantee: both jobs and outbox records persisted atomically
        jobRepository.saveAll(jobs);
        outboxEventRepository.saveAll(outboxEvents);
        batchRepository.updateStatus(batchId, BatchStatus.QUEUED);

        batch.setStatus(BatchStatus.QUEUED);
        return toDto(batch);
    }

    public BatchDtos.BatchProgressDto getBatchProgress(UUID batchId, UUID userId) {
        CertificateBatch batch = batchRepository.findById(batchId)
                .orElseThrow(() -> new IllegalArgumentException("Batch not found"));
        Event event = eventRepository.findById(batch.getEventId())
                .orElseThrow(() -> new IllegalArgumentException("Event not found"));
        organizationService.verifyMembership(event.getOrganizationId(), userId, UserRole.VIEWER);

        int total = batch.getTotalCount();
        int generated = batch.getGeneratedCount();
        int emailSent = batch.getEmailSentCount();
        int failed = batch.getFailedCount();
        int pending = Math.max(0, total - (generated + failed));

        double progress = total > 0 ? ((double) (generated + failed) / total) * 100.0 : 0.0;
        if (progress > 100.0) progress = 100.0;

        List<BatchDtos.BatchJobSummaryDto> recentFailures = jobRepository.findRecentFailures(batchId, 10);

        return BatchDtos.BatchProgressDto.builder()
                .batchId(batch.getId())
                .batchName(batch.getName())
                .status(batch.getStatus())
                .totalParticipants(total)
                .certificatesPending(pending)
                .certificatesGenerated(generated)
                .emailsPending(Math.max(0, generated - emailSent))
                .emailsSent(emailSent)
                .failedJobs(failed)
                .progressPercentage(Math.round(progress * 10.0) / 10.0)
                .recentFailures(recentFailures)
                .build();
    }

    public List<BatchDtos.BatchJobSummaryDto> getBatchJobs(UUID batchId, UUID userId, int page, int size) {
        CertificateBatch batch = batchRepository.findById(batchId)
                .orElseThrow(() -> new IllegalArgumentException("Batch not found"));
        Event event = eventRepository.findById(batch.getEventId())
                .orElseThrow(() -> new IllegalArgumentException("Event not found"));
        organizationService.verifyMembership(event.getOrganizationId(), userId, UserRole.VIEWER);

        int offset = Math.max(0, page) * Math.max(1, size);
        return jobRepository.findJobsByBatch(batchId, size, offset);
    }

    @Transactional
    public void cancelBatch(UUID batchId, UUID userId) {
        CertificateBatch batch = batchRepository.findById(batchId)
                .orElseThrow(() -> new IllegalArgumentException("Batch not found"));
        Event event = eventRepository.findById(batch.getEventId())
                .orElseThrow(() -> new IllegalArgumentException("Event not found"));
        organizationService.verifyMembership(event.getOrganizationId(), userId, UserRole.ADMIN);

        batchRepository.updateStatus(batchId, BatchStatus.CANCELLED);
    }

    public List<BatchDtos.BatchDto> getEventBatches(UUID eventId, UUID userId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event not found"));
        organizationService.verifyMembership(event.getOrganizationId(), userId, UserRole.VIEWER);

        return batchRepository.findByEventId(eventId);
    }

    public BatchDtos.BatchDto getBatch(UUID batchId, UUID userId) {
        CertificateBatch batch = batchRepository.findById(batchId)
                .orElseThrow(() -> new IllegalArgumentException("Batch not found"));
        Event event = eventRepository.findById(batch.getEventId())
                .orElseThrow(() -> new IllegalArgumentException("Event not found"));
        organizationService.verifyMembership(event.getOrganizationId(), userId, UserRole.VIEWER);

        return toDto(batch);
    }

    private BatchDtos.BatchDto toDto(CertificateBatch batch) {
        return BatchDtos.BatchDto.builder()
                .id(batch.getId())
                .eventId(batch.getEventId())
                .templateId(batch.getTemplateId())
                .name(batch.getName())
                .totalCount(batch.getTotalCount())
                .generatedCount(batch.getGeneratedCount())
                .emailSentCount(batch.getEmailSentCount())
                .failedCount(batch.getFailedCount())
                .status(batch.getStatus())
                .createdAt(batch.getCreatedAt())
                .completedAt(batch.getCompletedAt())
                .build();
    }
}
