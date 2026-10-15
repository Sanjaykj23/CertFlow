package com.certflow.api.controller;

import com.certflow.api.security.UserPrincipal;
import com.certflow.api.service.OrganizationService;
import com.certflow.common.domain.Organization;
import com.certflow.common.domain.OrganizationMember;
import com.certflow.common.domain.UserRole;
import com.certflow.common.dto.ApiResponse;
import com.certflow.common.dto.AuthDtos;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/organizations")
public class OrganizationController {

    private final OrganizationService organizationService;

    public OrganizationController(OrganizationService organizationService) {
        this.organizationService = organizationService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Organization>> createOrganization(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody Map<String, String> request
    ) {
        String name = request.get("name");
        if (name == null || name.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Organization name is required"));
        }
        Organization org = organizationService.createOrganization(principal.getId(), name);
        return ResponseEntity.ok(ApiResponse.ok("Organization created", org));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<AuthDtos.OrgMembershipDto>>> getMyOrganizations(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        List<AuthDtos.OrgMembershipDto> orgs = organizationService.getUserOrganizations(principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(orgs));
    }

    @PostMapping("/{organizationId}/members")
    public ResponseEntity<ApiResponse<OrganizationMember>> addMember(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("organizationId") UUID organizationId,
            @RequestBody Map<String, String> request
    ) {
        String email = request.get("email");
        String roleStr = request.getOrDefault("role", "OPERATOR");
        UserRole role = UserRole.valueOf(roleStr);

        OrganizationMember member = organizationService.addMember(organizationId, principal.getId(), email, role);
        return ResponseEntity.ok(ApiResponse.ok("Member added successfully", member));
    }

    @GetMapping("/{organizationId}/members")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getMembers(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("organizationId") UUID organizationId
    ) {
        List<Map<String, Object>> members = organizationService.getMembers(organizationId, principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(members));
    }
}
