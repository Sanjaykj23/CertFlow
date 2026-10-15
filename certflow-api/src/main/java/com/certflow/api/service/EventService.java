package com.certflow.api.service;

import com.certflow.api.repository.CertificateTemplateRepository;
import com.certflow.api.repository.EventRepository;
import com.certflow.common.domain.CertificateTemplate;
import com.certflow.common.domain.Event;
import com.certflow.common.domain.TemplateLayoutConfig;
import com.certflow.common.domain.UserRole;
import com.certflow.common.dto.EventDtos;
import com.certflow.common.util.DefaultTemplateLayoutFactory;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class EventService {

    private final EventRepository eventRepository;
    private final CertificateTemplateRepository templateRepository;
    private final OrganizationService organizationService;
    private final ObjectMapper objectMapper;

    public EventService(
            EventRepository eventRepository,
            CertificateTemplateRepository templateRepository,
            OrganizationService organizationService,
            ObjectMapper objectMapper
    ) {
        this.eventRepository = eventRepository;
        this.templateRepository = templateRepository;
        this.organizationService = organizationService;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public Event createEvent(UUID userId, EventDtos.CreateEventRequest request) {
        organizationService.verifyMembership(request.getOrganizationId(), userId, UserRole.ADMIN);

        Event event = Event.builder()
                .organizationId(request.getOrganizationId())
                .name(request.getName().trim())
                .description(request.getDescription())
                .eventDate(request.getEventDate())
                .archived(false)
                .build();
        event = eventRepository.save(event);

        // Auto-seed a default professional certificate template for the new event
        try {
            TemplateLayoutConfig defaultLayout = DefaultTemplateLayoutFactory.createDefaultLandscapeLayout();
            CertificateTemplate defaultTemplate = CertificateTemplate.builder()
                    .eventId(event.getId())
                    .name("Default Certificate Template")
                    .orientation(defaultLayout.getOrientation())
                    .width(defaultLayout.getWidth())
                    .height(defaultLayout.getHeight())
                    .layoutJson(objectMapper.writeValueAsString(defaultLayout))
                    .version(1)
                    .build();
            templateRepository.save(defaultTemplate);
        } catch (Exception ignored) {}

        return event;
    }

    public List<EventDtos.EventDto> getEvents(UUID organizationId, UUID userId) {
        organizationService.verifyMembership(organizationId, userId, UserRole.VIEWER);
        return eventRepository.findByOrganizationId(organizationId);
    }

    public Event getEvent(UUID eventId, UUID userId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event not found"));
        organizationService.verifyMembership(event.getOrganizationId(), userId, UserRole.VIEWER);
        return event;
    }

    @Transactional
    public Event updateEvent(UUID eventId, UUID userId, EventDtos.UpdateEventRequest request) {
        Event event = getEvent(eventId, userId);
        organizationService.verifyMembership(event.getOrganizationId(), userId, UserRole.ADMIN);

        event.setName(request.getName().trim());
        event.setDescription(request.getDescription());
        event.setEventDate(request.getEventDate());
        eventRepository.update(event);

        return event;
    }

    @Transactional
    public void archiveEvent(UUID eventId, UUID userId) {
        Event event = getEvent(eventId, userId);
        organizationService.verifyMembership(event.getOrganizationId(), userId, UserRole.ADMIN);

        event.setArchived(true);
        eventRepository.update(event);
    }
}
