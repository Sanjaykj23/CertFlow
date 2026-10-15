package com.certflow.worker.email;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.kafka.annotation.EnableKafka;

@SpringBootApplication(scanBasePackages = {"com.certflow.worker.email", "com.certflow.common"})
@EnableKafka
@ConfigurationPropertiesScan
public class EmailWorkerApplication {

    public static void main(String[] args) {
        SpringApplication.run(EmailWorkerApplication.class, args);
    }
}
