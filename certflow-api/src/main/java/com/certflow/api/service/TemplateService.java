package com.certflow.api.service;

import com.certflow.api.repository.CertificateTemplateRepository;
import com.certflow.common.domain.CertificateTemplate;
import com.certflow.common.domain.Event;
import com.certflow.common.domain.TemplateLayoutConfig;
import com.certflow.common.domain.UserRole;
import com.certflow.common.dto.TemplateDtos;
import com.certflow.common.storage.StorageService;
import com.certflow.common.util.DefaultTemplateLayoutFactory;
import com.certflow.common.util.PdfBoxRenderer;
import com.certflow.common.util.QrCodeGenerator;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDate;
import java.util.*;

@Service
public class TemplateService {

    private final CertificateTemplateRepository templateRepository;
    private final EventService eventService;
    private final OrganizationService organizationService;
    private final StorageService storageService;
    private final ObjectMapper objectMapper;

    @Value("${certflow.s3.bucket-templates:certflow-templates}")
    private String templatesBucket;

    public TemplateService(
            CertificateTemplateRepository templateRepository,
            EventService eventService,
            OrganizationService organizationService,
            StorageService storageService,
            ObjectMapper objectMapper
    ) {
        this.templateRepository = templateRepository;
        this.eventService = eventService;
        this.organizationService = organizationService;
        this.storageService = storageService;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public TemplateDtos.TemplateDto createTemplate(
            UUID eventId,
            UUID userId,
            TemplateDtos.SaveTemplateRequest request,
            MultipartFile background
    ) {
        Event event = eventService.getEvent(eventId, userId);
        organizationService.verifyMembership(event.getOrganizationId(), userId, UserRole.ADMIN);

        String bgKey = null;
        if (background != null && !background.isEmpty()) {
            bgKey = uploadBackgroundImage(eventId, background);
        } else if (request.getBackgroundStorageKey() != null) {
            bgKey = request.getBackgroundStorageKey();
        }

        TemplateLayoutConfig layout = request.getLayoutConfig() != null
                ? request.getLayoutConfig()
                : DefaultTemplateLayoutFactory.createDefaultLandscapeLayout();

        String layoutJson;
        try {
            layoutJson = objectMapper.writeValueAsString(layout);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Invalid layout configuration JSON", e);
        }

        CertificateTemplate template = CertificateTemplate.builder()
                .eventId(eventId)
                .name(request.getName().trim())
                .backgroundStorageKey(bgKey)
                .orientation(request.getOrientation() != null ? request.getOrientation() : layout.getOrientation())
                .width(request.getWidth() > 0 ? request.getWidth() : layout.getWidth())
                .height(request.getHeight() > 0 ? request.getHeight() : layout.getHeight())
                .layoutJson(layoutJson)
                .version(1)
                .build();

        template = templateRepository.save(template);
        return toDto(template);
    }

    @Transactional
    public TemplateDtos.TemplateDto updateTemplate(
            UUID templateId,
            UUID userId,
            TemplateDtos.SaveTemplateRequest request,
            MultipartFile background
    ) {
        CertificateTemplate template = templateRepository.findById(templateId)
                .orElseThrow(() -> new IllegalArgumentException("Template not found"));
        Event event = eventService.getEvent(template.getEventId(), userId);
        organizationService.verifyMembership(event.getOrganizationId(), userId, UserRole.ADMIN);

        if (background != null && !background.isEmpty()) {
            String bgKey = uploadBackgroundImage(template.getEventId(), background);
            template.setBackgroundStorageKey(bgKey);
        }

        template.setName(request.getName().trim());
        if (request.getOrientation() != null) template.setOrientation(request.getOrientation());
        if (request.getWidth() > 0) template.setWidth(request.getWidth());
        if (request.getHeight() > 0) template.setHeight(request.getHeight());

        if (request.getLayoutConfig() != null) {
            try {
                template.setLayoutJson(objectMapper.writeValueAsString(request.getLayoutConfig()));
            } catch (JsonProcessingException e) {
                throw new IllegalArgumentException("Invalid layout configuration JSON", e);
            }
        }

        templateRepository.update(template);
        return toDto(template);
    }

    public List<TemplateDtos.TemplateDto> getTemplates(UUID eventId, UUID userId) {
        Event event = eventService.getEvent(eventId, userId);
        organizationService.verifyMembership(event.getOrganizationId(), userId, UserRole.VIEWER);

        return templateRepository.findByEventId(eventId).stream()
                .map(this::toDto)
                .toList();
    }

    public TemplateDtos.TemplateDto getTemplate(UUID templateId, UUID userId) {
        CertificateTemplate template = templateRepository.findById(templateId)
                .orElseThrow(() -> new IllegalArgumentException("Template not found"));
        Event event = eventService.getEvent(template.getEventId(), userId);
        organizationService.verifyMembership(event.getOrganizationId(), userId, UserRole.VIEWER);

        return toDto(template);
    }

    public byte[] previewTemplate(TemplateDtos.PreviewTemplateRequest request) throws IOException {
        TemplateLayoutConfig layout = request.getLayoutConfig() != null
                ? request.getLayoutConfig()
                : DefaultTemplateLayoutFactory.createDefaultLandscapeLayout();

        byte[] bgBytes = null;
        if (request.getBackgroundStorageKey() != null && !request.getBackgroundStorageKey().isBlank()) {
            try {
                bgBytes = storageService.downloadFile(templatesBucket, request.getBackgroundStorageKey());
            } catch (Exception ignored) {}
        }

        byte[] qrBytes = null;
        if (layout.getQrCode() != null && layout.getQrCode().isEnabled()) {
            qrBytes = QrCodeGenerator.generateQrCodePng("https://certflow.io/verify/SAMPLE-TOKEN-12345", 200, 200);
        }

        Map<String, String> placeholders = new HashMap<>();
        String sampleName = request.getSampleParticipantName() != null ? request.getSampleParticipantName() : "Alex Morgan";
        String sampleEvent = request.getSampleEventName() != null ? request.getSampleEventName() : "Global Innovation Hackathon 2026";
        String sampleOrg = request.getSampleOrganizationName() != null ? request.getSampleOrganizationName() : "CertFlow Labs";
        String sampleType = request.getSampleCertificateType() != null ? request.getSampleCertificateType() : "Winner";
        String sampleDate = LocalDate.now().toString();
        String sampleCertNum = "CF-2026-DEMO-9999";

        placeholders.put("participant_name", sampleName);
        placeholders.put("name", sampleName);
        placeholders.put("full_name", sampleName);
        placeholders.put("event_name", sampleEvent);
        placeholders.put("event", sampleEvent);
        placeholders.put("organization_name", sampleOrg);
        placeholders.put("organization", sampleOrg);
        placeholders.put("org_name", sampleOrg);
        placeholders.put("certificate_type", sampleType);
        placeholders.put("type", sampleType);
        placeholders.put("certificate_id", sampleCertNum);
        placeholders.put("certificate_number", sampleCertNum);
        placeholders.put("certificateNumber", sampleCertNum);
        placeholders.put("issue_date", sampleDate);
        placeholders.put("date", sampleDate);

        return PdfBoxRenderer.renderCertificatePdf(layout, bgBytes, qrBytes, placeholders);
    }

    private String uploadBackgroundImage(UUID eventId, MultipartFile file) {
        String ext = "png";
        if (file.getOriginalFilename() != null && file.getOriginalFilename().contains(".")) {
            ext = file.getOriginalFilename().substring(file.getOriginalFilename().lastIndexOf(".") + 1).toLowerCase();
        }
        String key = "events/" + eventId + "/templates/" + UUID.randomUUID() + "." + ext;
        try {
            return storageService.uploadFile(templatesBucket, key, file.getBytes(), file.getContentType());
        } catch (IOException e) {
            throw new RuntimeException("Failed to upload background image", e);
        }
    }

    private TemplateDtos.TemplateDto toDto(CertificateTemplate template) {
        TemplateLayoutConfig layout = null;
        try {
            layout = objectMapper.readValue(template.getLayoutJson(), TemplateLayoutConfig.class);
        } catch (Exception ignored) {}

        return TemplateDtos.TemplateDto.builder()
                .id(template.getId())
                .eventId(template.getEventId())
                .name(template.getName())
                .backgroundStorageKey(template.getBackgroundStorageKey())
                .orientation(template.getOrientation())
                .width(template.getWidth())
                .height(template.getHeight())
                .layoutConfig(layout)
                .version(template.getVersion())
                .createdAt(template.getCreatedAt())
                .updatedAt(template.getUpdatedAt())
                .build();
    }
}
