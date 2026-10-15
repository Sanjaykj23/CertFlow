package com.certflow.api.controller;

import com.certflow.api.service.PublicVerificationService;
import com.certflow.common.dto.ApiResponse;
import com.certflow.common.dto.CertificateDtos;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/public")
public class PublicVerificationController {

    private final PublicVerificationService verificationService;

    public PublicVerificationController(PublicVerificationService verificationService) {
        this.verificationService = verificationService;
    }

    @GetMapping("/verify/{verificationToken}")
    public ResponseEntity<ApiResponse<CertificateDtos.PublicVerificationDto>> verifyCertificate(
            @PathVariable("verificationToken") String verificationToken
    ) {
        CertificateDtos.PublicVerificationDto dto = verificationService.verifyCertificate(verificationToken);
        return ResponseEntity.ok(ApiResponse.ok(dto));
    }
}
