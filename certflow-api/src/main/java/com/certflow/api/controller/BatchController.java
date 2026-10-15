package com.certflow.api.controller;

import com.certflow.api.security.UserPrincipal;
import com.certflow.api.service.BatchService;
import com.certflow.common.dto.ApiResponse;
import com.certflow.common.dto.BatchDtos;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class BatchController {

    private final BatchService batchService;

    public BatchController(BatchService batchService) {
        this.batchService = batchService;
    }

    @PostMapping("/events/{eventId}/batches")
    public ResponseEntity<ApiResponse<BatchDtos.BatchDto>> createBatch(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("eventId") UUID eventId,
            @Valid @RequestBody BatchDtos.CreateBatchRequest request
    ) {
        BatchDtos.BatchDto batch = batchService.createBatch(eventId, principal.getId(), request);
        return ResponseEntity.ok(ApiResponse.ok("Batch created successfully", batch));
    }

    @GetMapping("/events/{eventId}/batches")
    public ResponseEntity<ApiResponse<List<BatchDtos.BatchDto>>> getEventBatches(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("eventId") UUID eventId
    ) {
        List<BatchDtos.BatchDto> batches = batchService.getEventBatches(eventId, principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(batches));
    }

    @GetMapping("/batches/{batchId}")
    public ResponseEntity<ApiResponse<BatchDtos.BatchDto>> getBatch(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("batchId") UUID batchId
    ) {
        BatchDtos.BatchDto batch = batchService.getBatch(batchId, principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(batch));
    }

    @PostMapping("/batches/{batchId}/start")
    public ResponseEntity<ApiResponse<BatchDtos.BatchDto>> startBatch(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("batchId") UUID batchId
    ) {
        BatchDtos.BatchDto batch = batchService.startBatch(batchId, principal.getId());
        return ResponseEntity.ok(ApiResponse.ok("Batch queued for processing", batch));
    }

    @PostMapping("/batches/{batchId}/cancel")
    public ResponseEntity<ApiResponse<Void>> cancelBatch(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("batchId") UUID batchId
    ) {
        batchService.cancelBatch(batchId, principal.getId());
        return ResponseEntity.ok(ApiResponse.ok("Batch cancelled successfully", null));
    }

    @GetMapping("/batches/{batchId}/progress")
    public ResponseEntity<ApiResponse<BatchDtos.BatchProgressDto>> getBatchProgress(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("batchId") UUID batchId
    ) {
        BatchDtos.BatchProgressDto progress = batchService.getBatchProgress(batchId, principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(progress));
    }

    @GetMapping("/batches/{batchId}/jobs")
    public ResponseEntity<ApiResponse<List<BatchDtos.BatchJobSummaryDto>>> getBatchJobs(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("batchId") UUID batchId,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "50") int size
    ) {
        List<BatchDtos.BatchJobSummaryDto> jobs = batchService.getBatchJobs(batchId, principal.getId(), page, size);
        return ResponseEntity.ok(ApiResponse.ok(jobs));
    }
}
