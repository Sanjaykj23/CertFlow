package com.certflow.api.config;

import com.certflow.common.storage.FileSystemStorageService;
import com.certflow.common.storage.S3StorageService;
import com.certflow.common.storage.StorageService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;

import java.net.URI;

@Configuration
public class S3Config {

    @Value("${certflow.s3.endpoint:http://localhost:9000}")
    private String endpoint;

    @Value("${certflow.s3.access-key:minioadmin}")
    private String accessKey;

    @Value("${certflow.s3.secret-key:minioadmin}")
    private String secretKey;

    @Value("${certflow.s3.region:us-east-1}")
    private String region;

    @Value("${certflow.s3.bucket-templates:certflow-templates}")
    private String templatesBucket;

    @Value("${certflow.s3.bucket-certificates:certflow-certificates}")
    private String certificatesBucket;

    @Bean
    @ConditionalOnProperty(name = "certflow.storage.type", havingValue = "s3", matchIfMissing = true)
    public S3Client s3Client() {
        S3Configuration serviceConfiguration = S3Configuration.builder()
                .pathStyleAccessEnabled(true)
                .build();

        return S3Client.builder()
                .endpointOverride(URI.create(endpoint))
                .region(Region.of(region))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(accessKey, secretKey)))
                .serviceConfiguration(serviceConfiguration)
                .build();
    }

    @Bean
    @ConditionalOnProperty(name = "certflow.storage.type", havingValue = "s3", matchIfMissing = true)
    public StorageService s3StorageService(S3Client s3Client) {
        S3StorageService storageService = new S3StorageService(s3Client);
        try {
            storageService.ensureBucketExists(templatesBucket);
            storageService.ensureBucketExists(certificatesBucket);
        } catch (Exception ignored) {
            // Bucket creation may defer if S3 is initializing
        }
        return storageService;
    }

    @Bean
    @ConditionalOnProperty(name = "certflow.storage.type", havingValue = "local")
    public StorageService localStorageService(@Value("${certflow.storage.local-dir:storage-data}") String localDir) {
        FileSystemStorageService storage = new FileSystemStorageService(localDir);
        storage.ensureBucketExists(templatesBucket);
        storage.ensureBucketExists(certificatesBucket);
        return storage;
    }
}
