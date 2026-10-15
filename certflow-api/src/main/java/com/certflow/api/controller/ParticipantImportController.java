package com.certflow.api.controller;

import com.certflow.api.security.UserPrincipal;
import com.certflow.api.service.CsvImportService;
import com.certflow.api.service.EventService;
import com.certflow.api.service.OrganizationService;
import com.certflow.common.domain.Event;
import com.certflow.common.domain.UserRole;
import com.certflow.common.dto.ApiResponse;
import com.certflow.common.dto.CsvDtos;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class ParticipantImportController {

    private final CsvImportService csvImportService;
    private final EventService eventService;
    private final OrganizationService organizationService;

    public ParticipantImportController(
            CsvImportService csvImportService,
            EventService eventService,
            OrganizationService organizationService
    ) {
        this.csvImportService = csvImportService;
        this.eventService = eventService;
        this.organizationService = organizationService;
    }

    @PostMapping("/events/{eventId}/participants/import")
    public ResponseEntity<ApiResponse<CsvDtos.CsvValidationResultDto>> importParticipants(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("eventId") UUID eventId,
            @RequestParam("file") MultipartFile file
    ) throws IOException {
        Event event = eventService.getEvent(eventId, principal.getId());
        organizationService.verifyMembership(event.getOrganizationId(), principal.getId(), UserRole.OPERATOR);

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Uploaded CSV file is empty"));
        }

        CsvDtos.CsvValidationResultDto result = csvImportService.validateCsv(file.getInputStream());
        return ResponseEntity.ok(ApiResponse.ok("CSV parsed and validated successfully", result));
    }
}
