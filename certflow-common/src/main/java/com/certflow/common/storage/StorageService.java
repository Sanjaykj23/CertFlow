package com.certflow.common.storage;

import java.time.Duration;

public interface StorageService {
    String uploadFile(String bucket, String key, byte[] content, String contentType);
    byte[] downloadFile(String bucket, String key);
    boolean exists(String bucket, String key);
    void deleteFile(String bucket, String key);
    void ensureBucketExists(String bucket);
}
