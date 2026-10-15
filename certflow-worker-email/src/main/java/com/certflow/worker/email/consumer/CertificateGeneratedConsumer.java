package com.certflow.worker.email.consumer;

import com.certflow.common.event.CertificateGeneratedEvent;
import com.certflow.worker.email.service.EmailDeliveryProcessor;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
public class CertificateGeneratedConsumer {

    private static final Logger log = LoggerFactory.getLogger(CertificateGeneratedConsumer.class);

    private final EmailDeliveryProcessor emailProcessor;
    private final ObjectMapper objectMapper;

    public CertificateGeneratedConsumer(EmailDeliveryProcessor emailProcessor, ObjectMapper objectMapper) {
        this.emailProcessor = emailProcessor;
        this.objectMapper = objectMapper;
    }

    @KafkaListener(topics = "certflow.certificate.generated", groupId = "${spring.kafka.consumer.group-id}")
    public void consumeCertificateGenerated(String messageJson) {
        try {
            CertificateGeneratedEvent event = objectMapper.readValue(messageJson, CertificateGeneratedEvent.class);
            log.info("Received certificate generated event for certificate {} to {}", event.getCertificateNumber(), event.getRecipientEmail());
            emailProcessor.processEmailDelivery(event);
        } catch (Exception ex) {
            log.error("Failed to process certificate generated event: {}", ex.getMessage(), ex);
        }
    }
}
