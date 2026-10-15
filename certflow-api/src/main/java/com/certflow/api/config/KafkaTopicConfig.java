package com.certflow.api.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

@Configuration
@ConditionalOnProperty(name = "certflow.kafka.enabled", havingValue = "true", matchIfMissing = true)
public class KafkaTopicConfig {

    public static final String TOPIC_CERTIFICATE_JOBS = "certflow.certificate.jobs";
    public static final String TOPIC_CERTIFICATE_GENERATED = "certflow.certificate.generated";
    public static final String TOPIC_DLQ = "certflow.dlq";

    @Bean
    public NewTopic certificateJobsTopic() {
        return TopicBuilder.name(TOPIC_CERTIFICATE_JOBS)
                .partitions(3)
                .replicas(1)
                .build();
    }

    @Bean
    public NewTopic certificateGeneratedTopic() {
        return TopicBuilder.name(TOPIC_CERTIFICATE_GENERATED)
                .partitions(3)
                .replicas(1)
                .build();
    }

    @Bean
    public NewTopic dlqTopic() {
        return TopicBuilder.name(TOPIC_DLQ)
                .partitions(3)
                .replicas(1)
                .build();
    }
}
