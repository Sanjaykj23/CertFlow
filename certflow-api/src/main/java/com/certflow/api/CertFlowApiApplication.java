package com.certflow.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;

@SpringBootApplication(scanBasePackages = {"com.certflow.api", "com.certflow.common"})
@EnableScheduling
@ConfigurationPropertiesScan
public class CertFlowApiApplication {

    static {
        loadEnvFile();
    }

    private static void loadEnvFile() {
        File[] possibleFiles = new File[]{
                new File(".env"),
                new File("../.env"),
                new File("../../.env")
        };
        for (File f : possibleFiles) {
            if (f.exists() && f.isFile()) {
                try (BufferedReader br = new BufferedReader(new FileReader(f))) {
                    String line;
                    while ((line = br.readLine()) != null) {
                        line = line.trim();
                        if (line.isEmpty() || line.startsWith("#") || !line.contains("=")) {
                            continue;
                        }
                        int eq = line.indexOf('=');
                        String key = line.substring(0, eq).trim();
                        String val = line.substring(eq + 1).trim();
                        if (System.getProperty(key) == null && System.getenv(key) == null) {
                            System.setProperty(key, val);
                        }
                    }
                } catch (Exception ignored) {}
                break;
            }
        }
    }

    public static void main(String[] args) {
        SpringApplication.run(CertFlowApiApplication.class, args);
    }
}
