package com.certflow.worker.pdf;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.kafka.annotation.EnableKafka;

@SpringBootApplication(scanBasePackages = {"com.certflow.worker.pdf", "com.certflow.common"})
@EnableKafka
@ConfigurationPropertiesScan
public class PdfWorkerApplication {

    public static void main(String[] args) {
        SpringApplication.run(PdfWorkerApplication.class, args);
    }
}
