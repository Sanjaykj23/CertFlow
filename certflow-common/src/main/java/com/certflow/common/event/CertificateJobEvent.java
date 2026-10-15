package com.certflow.common.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CertificateJobEvent implements Serializable {
    private UUID jobId;
    private UUID batchId;
    private UUID eventId;
    private UUID templateId;
    private UUID participantId;
    private String participantName;
    private String recipientEmail;
    private String certificateType;
    private String eventName;
    private String organizationName;
    private LocalDate issueDate;
    private Map<String, String> customAttributes;
    private int attemptNumber;
}
