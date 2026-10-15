package com.certflow.api.service;

import com.certflow.api.config.KafkaTopicConfig;
import com.certflow.api.repository.OutboxEventRepository;
import com.certflow.common.domain.OutboxEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class OutboxPublisher {

    private static final Logger log = LoggerFactory.getLogger(OutboxPublisher.class);

    private final OutboxEventRepository outboxEventRepository;
    private final KafkaTemplate<String, String> kafkaTemplate;

    public OutboxPublisher(
            OutboxEventRepository outboxEventRepository,
            @Autowired(required = false) KafkaTemplate<String, String> kafkaTemplate
    ) {
        this.outboxEventRepository = outboxEventRepository;
        this.kafkaTemplate = kafkaTemplate;
    }

    @Scheduled(fixedDelay = 1000)
    public void publishPendingEvents() {
        try {
            List<OutboxEvent> pendingEvents = outboxEventRepository.findPendingEvents(50);
            if (pendingEvents.isEmpty()) {
                return;
            }

            if (kafkaTemplate == null) {
                for (OutboxEvent event : pendingEvents) {
                    outboxEventRepository.markPublished(event.getId());
                    log.info("Local mode: marked outbox event {} as published", event.getId());
                }
                return;
            }

            for (OutboxEvent event : pendingEvents) {
                String targetTopic = determineTopic(event.getAggregateType());
                String messageKey = event.getAggregateId().toString();

                kafkaTemplate.send(targetTopic, messageKey, event.getPayloadJson())
                        .whenComplete((result, ex) -> {
                            if (ex == null) {
                                outboxEventRepository.markPublished(event.getId());
                                log.debug("Published outbox event {} to topic {}", event.getId(), targetTopic);
                            } else {
                                log.error("Failed to publish outbox event {} to Kafka: {}", event.getId(), ex.getMessage());
                                outboxEventRepository.markFailed(event.getId(), ex.getMessage());
                            }
                        });
            }
        } catch (Exception ex) {
            log.error("Error in OutboxPublisher scheduled loop: {}", ex.getMessage());
        }
    }

    private String determineTopic(String aggregateType) {
        if ("CERTIFICATE_GENERATED".equalsIgnoreCase(aggregateType)) {
            return KafkaTopicConfig.TOPIC_CERTIFICATE_GENERATED;
        }
        return KafkaTopicConfig.TOPIC_CERTIFICATE_JOBS;
    }
}
