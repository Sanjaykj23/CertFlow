package com.certflow.api.controller;

import com.certflow.api.security.UserPrincipal;
import com.certflow.api.service.EventService;
import com.certflow.common.domain.Event;
import com.certflow.common.dto.ApiResponse;
import com.certflow.common.dto.EventDtos;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/events")
public class EventController {

    private final EventService eventService;

    public EventController(EventService eventService) {
        this.eventService = eventService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Event>> createEvent(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody EventDtos.CreateEventRequest request
    ) {
        Event event = eventService.createEvent(principal.getId(), request);
        return ResponseEntity.ok(ApiResponse.ok("Event created successfully", event));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<EventDtos.EventDto>>> getEvents(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam("organizationId") UUID organizationId
    ) {
        List<EventDtos.EventDto> events = eventService.getEvents(organizationId, principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(events));
    }

    @GetMapping("/{eventId}")
    public ResponseEntity<ApiResponse<Event>> getEvent(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("eventId") UUID eventId
    ) {
        Event event = eventService.getEvent(eventId, principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(event));
    }

    @PutMapping("/{eventId}")
    public ResponseEntity<ApiResponse<Event>> updateEvent(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("eventId") UUID eventId,
            @Valid @RequestBody EventDtos.UpdateEventRequest request
    ) {
        Event event = eventService.updateEvent(eventId, principal.getId(), request);
        return ResponseEntity.ok(ApiResponse.ok("Event updated successfully", event));
    }

    @DeleteMapping("/{eventId}")
    public ResponseEntity<ApiResponse<Void>> archiveEvent(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("eventId") UUID eventId
    ) {
        eventService.archiveEvent(eventId, principal.getId());
        return ResponseEntity.ok(ApiResponse.ok("Event archived successfully", null));
    }
}
