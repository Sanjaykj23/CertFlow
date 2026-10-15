package com.certflow.common.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Event {
    private UUID id;
    private UUID organizationId;
    private String name;
    private String description;
    private LocalDate eventDate;
    private boolean archived;
    private Instant createdAt;
    private Instant updatedAt;
}
