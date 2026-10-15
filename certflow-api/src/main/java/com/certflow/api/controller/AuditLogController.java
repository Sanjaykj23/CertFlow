package com.certflow.api.controller;

import com.certflow.api.repository.AuditLogRepository;
import com.certflow.api.security.UserPrincipal;
import com.certflow.api.service.OrganizationService;
import com.certflow.common.domain.AuditLog;
import com.certflow.common.domain.UserRole;
import com.certflow.common.dto.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class AuditLogController {

    private final AuditLogRepository auditLogRepository;
    private final OrganizationService organizationService;

    public AuditLogController(AuditLogRepository auditLogRepository, OrganizationService organizationService) {
        this.auditLogRepository = auditLogRepository;
        this.organizationService = organizationService;
    }

    @GetMapping("/organizations/{organizationId}/audit-logs")
    public ResponseEntity<ApiResponse<List<AuditLog>>> getAuditLogs(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("organizationId") UUID organizationId,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "50") int size
    ) {
        organizationService.verifyMembership(organizationId, principal.getId(), UserRole.ADMIN);
        int offset = Math.max(0, page) * Math.max(1, size);
        List<AuditLog> logs = auditLogRepository.findByOrganizationId(organizationId, size, offset);
        return ResponseEntity.ok(ApiResponse.ok(logs));
    }
}
