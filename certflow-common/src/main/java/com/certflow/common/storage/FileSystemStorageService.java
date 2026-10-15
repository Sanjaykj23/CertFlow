package com.certflow.common.storage;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;

public class FileSystemStorageService implements StorageService {
    private static final Logger log = LoggerFactory.getLogger(FileSystemStorageService.class);

    private final Path basePath;

    public FileSystemStorageService(String storageDirectory) {
        this.basePath = Paths.get(storageDirectory).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.basePath);
            log.info("Initialized local FileSystemStorageService at: {}", this.basePath);
        } catch (IOException e) {
            throw new RuntimeException("Failed to initialize storage directory: " + this.basePath, e);
        }
    }

    @Override
    public String uploadFile(String bucket, String key, byte[] content, String contentType) {
        try {
            Path targetPath = resolvePath(bucket, key);
            Files.createDirectories(targetPath.getParent());
            Files.write(targetPath, content, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
            log.info("Stored file locally at bucket: {}, key: {} ({} bytes)", bucket, key, content.length);
            return key;
        } catch (IOException e) {
            throw new RuntimeException("Failed to upload local file: " + key, e);
        }
    }

    @Override
    public byte[] downloadFile(String bucket, String key) {
        try {
            Path targetPath = resolvePath(bucket, key);
            if (!Files.exists(targetPath)) {
                throw new RuntimeException("Local file not found: " + bucket + "/" + key);
            }
            return Files.readAllBytes(targetPath);
        } catch (IOException e) {
            throw new RuntimeException("Failed to read local file: " + key, e);
        }
    }

    @Override
    public boolean exists(String bucket, String key) {
        return Files.exists(resolvePath(bucket, key));
    }

    @Override
    public void deleteFile(String bucket, String key) {
        try {
            Path targetPath = resolvePath(bucket, key);
            Files.deleteIfExists(targetPath);
        } catch (IOException e) {
            log.warn("Failed to delete local file: {}", key, e);
        }
    }

    @Override
    public void ensureBucketExists(String bucket) {
        try {
            Path bucketDir = basePath.resolve(bucket);
            Files.createDirectories(bucketDir);
        } catch (IOException e) {
            throw new RuntimeException("Failed to create bucket directory: " + bucket, e);
        }
    }

    private Path resolvePath(String bucket, String key) {
        return basePath.resolve(bucket).resolve(key).normalize();
    }
}
