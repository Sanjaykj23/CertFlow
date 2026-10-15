package com.certflow.api.controller;

import com.certflow.api.security.UserPrincipal;
import com.certflow.api.service.TemplateService;
import com.certflow.common.dto.ApiResponse;
import com.certflow.common.dto.TemplateDtos;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class TemplateController {

    private final TemplateService templateService;

    public TemplateController(TemplateService templateService) {
        this.templateService = templateService;
    }

    @PostMapping("/events/{eventId}/templates")
    public ResponseEntity<ApiResponse<TemplateDtos.TemplateDto>> createTemplate(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("eventId") UUID eventId,
            @RequestPart("template") @Valid TemplateDtos.SaveTemplateRequest request,
            @RequestPart(value = "background", required = false) MultipartFile background
    ) {
        TemplateDtos.TemplateDto dto = templateService.createTemplate(eventId, principal.getId(), request, background);
        return ResponseEntity.ok(ApiResponse.ok("Template created successfully", dto));
    }

    @GetMapping("/events/{eventId}/templates")
    public ResponseEntity<ApiResponse<List<TemplateDtos.TemplateDto>>> getTemplates(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("eventId") UUID eventId
    ) {
        List<TemplateDtos.TemplateDto> templates = templateService.getTemplates(eventId, principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(templates));
    }

    @GetMapping("/templates/{templateId}")
    public ResponseEntity<ApiResponse<TemplateDtos.TemplateDto>> getTemplate(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("templateId") UUID templateId
    ) {
        TemplateDtos.TemplateDto template = templateService.getTemplate(templateId, principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(template));
    }

    @PutMapping("/templates/{templateId}")
    public ResponseEntity<ApiResponse<TemplateDtos.TemplateDto>> updateTemplate(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("templateId") UUID templateId,
            @RequestPart("template") @Valid TemplateDtos.SaveTemplateRequest request,
            @RequestPart(value = "background", required = false) MultipartFile background
    ) {
        TemplateDtos.TemplateDto dto = templateService.updateTemplate(templateId, principal.getId(), request, background);
        return ResponseEntity.ok(ApiResponse.ok("Template updated successfully", dto));
    }

    @PostMapping(value = "/templates/preview", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> previewTemplate(@RequestBody TemplateDtos.PreviewTemplateRequest request) throws IOException {
        byte[] pdfBytes = templateService.previewTemplate(request);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"certificate-preview.pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdfBytes);
    }
}
