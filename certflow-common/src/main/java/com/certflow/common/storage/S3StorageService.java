package com.certflow.common.storage;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;

public class S3StorageService implements StorageService {
    private static final Logger log = LoggerFactory.getLogger(S3StorageService.class);

    private final S3Client s3Client;

    public S3StorageService(S3Client s3Client) {
        this.s3Client = s3Client;
    }

    @Override
    public String uploadFile(String bucket, String key, byte[] content, String contentType) {
        ensureBucketExists(bucket);
        PutObjectRequest putRequest = PutObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .contentType(contentType != null ? contentType : "application/octet-stream")
                .build();
        s3Client.putObject(putRequest, RequestBody.fromBytes(content));
        log.info("Uploaded object to bucket: {}, key: {} ({} bytes)", bucket, key, content.length);
        return key;
    }

    @Override
    public byte[] downloadFile(String bucket, String key) {
        GetObjectRequest getRequest = GetObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .build();
        ResponseBytes<GetObjectResponse> objectBytes = s3Client.getObjectAsBytes(getRequest);
        return objectBytes.asByteArray();
    }

    @Override
    public boolean exists(String bucket, String key) {
        try {
            HeadObjectRequest headRequest = HeadObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .build();
            s3Client.headObject(headRequest);
            return true;
        } catch (NoSuchKeyException e) {
            return false;
        } catch (S3Exception e) {
            if (e.statusCode() == 404) {
                return false;
            }
            throw e;
        }
    }

    @Override
    public void deleteFile(String bucket, String key) {
        DeleteObjectRequest deleteRequest = DeleteObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .build();
        s3Client.deleteObject(deleteRequest);
    }

    @Override
    public void ensureBucketExists(String bucket) {
        try {
            s3Client.headBucket(HeadBucketRequest.builder().bucket(bucket).build());
        } catch (S3Exception e) {
            log.info("Bucket {} does not exist, creating it now", bucket);
            try {
                s3Client.createBucket(CreateBucketRequest.builder().bucket(bucket).build());
            } catch (Exception createEx) {
                log.warn("Could not create bucket {}: {}", bucket, createEx.getMessage());
            }
        }
    }
}
