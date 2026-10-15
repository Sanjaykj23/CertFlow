package com.certflow.api.service;

import com.certflow.api.repository.CertificateRepository;
import com.certflow.common.domain.CertificateStatus;
import com.certflow.common.dto.CertificateDtos;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
public class PublicVerificationService {

    private static final Logger log = LoggerFactory.getLogger(PublicVerificationService.class);
    private static final String CACHE_PREFIX = "cert:verify:";

    private final CertificateRepository certificateRepository;
    private final RedisTemplate<String, Object> redisTemplate;

    public PublicVerificationService(
            CertificateRepository certificateRepository,
            @Autowired(required = false) RedisTemplate<String, Object> redisTemplate
    ) {
        this.certificateRepository = certificateRepository;
        this.redisTemplate = redisTemplate;
    }

    public CertificateDtos.PublicVerificationDto verifyCertificate(String token) {
        if (token == null || token.isBlank()) {
            return notFoundDto();
        }

        String cacheKey = CACHE_PREFIX + token.trim();

        // 1. Check Redis Distributed Cache if available
        if (redisTemplate != null) {
            try {
                Object cached = redisTemplate.opsForValue().get(cacheKey);
                if (cached instanceof CertificateDtos.PublicVerificationDto dto) {
                    log.debug("Verification cache hit for token {}", token);
                    return dto;
                }
            } catch (Exception ex) {
                log.warn("Redis cache read failure, falling back to database: {}", ex.getMessage());
            }
        }

        // 2. Query Database
        CertificateDtos.PublicVerificationDto result = certificateRepository.getPublicVerificationDetails(token.trim())
                .orElse(notFoundDto());

        // 3. Cache valid results in Redis if available (TTL = 1 hour)
        if (result.isValid() && redisTemplate != null) {
            try {
                redisTemplate.opsForValue().set(cacheKey, result, Duration.ofHours(1));
            } catch (Exception ex) {
                log.warn("Failed to write verification result to Redis: {}", ex.getMessage());
            }
        }

        return result;
    }

    private CertificateDtos.PublicVerificationDto notFoundDto() {
        return CertificateDtos.PublicVerificationDto.builder()
                .valid(false)
                .status(null)
                .message("No certificate found with this verification token. The link may be invalid or expired.")
                .build();
    }
}
