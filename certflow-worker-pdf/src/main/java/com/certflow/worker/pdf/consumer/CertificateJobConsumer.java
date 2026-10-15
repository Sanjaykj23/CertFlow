package com.certflow.worker.pdf.consumer;

import com.certflow.common.event.CertificateJobEvent;
import com.certflow.worker.pdf.service.PdfGenerationProcessor;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
public class CertificateJobConsumer {

    private static final Logger log = LoggerFactory.getLogger(CertificateJobConsumer.class);

    private final PdfGenerationProcessor pdfProcessor;
    private final ObjectMapper objectMapper;

    public CertificateJobConsumer(PdfGenerationProcessor pdfProcessor, ObjectMapper objectMapper) {
        this.pdfProcessor = pdfProcessor;
        this.objectMapper = objectMapper;
    }

    @KafkaListener(topics = "certflow.certificate.jobs", groupId = "${spring.kafka.consumer.group-id}")
    public void consumeCertificateJob(String messageJson) {
        try {
            CertificateJobEvent event = objectMapper.readValue(messageJson, CertificateJobEvent.class);
            log.info("Received certificate job event for participant {} in batch {}", event.getRecipientEmail(), event.getBatchId());
            pdfProcessor.processCertificateJob(event);
        } catch (Exception ex) {
            log.error("Failed to parse or process certificate job event: {}", ex.getMessage(), ex);
        }
    }
}
