package com.certflow.api.controller;

import com.certflow.api.security.UserPrincipal;
import com.certflow.api.service.CertificateService;
import com.certflow.common.dto.ApiResponse;
import com.certflow.common.dto.CertificateDtos;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class CertificateController {

    private final CertificateService certificateService;

    public CertificateController(CertificateService certificateService) {
        this.certificateService = certificateService;
    }

    @GetMapping("/events/{eventId}/certificates")
    public ResponseEntity<ApiResponse<List<CertificateDtos.CertificateDto>>> getEventCertificates(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("eventId") UUID eventId,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "50") int size
    ) {
        List<CertificateDtos.CertificateDto> certs = certificateService.getEventCertificates(eventId, principal.getId(), page, size);
        return ResponseEntity.ok(ApiResponse.ok(certs));
    }

    @GetMapping("/certificates/{certificateId}")
    public ResponseEntity<ApiResponse<CertificateDtos.CertificateDto>> getCertificate(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("certificateId") UUID certificateId
    ) {
        CertificateDtos.CertificateDto cert = certificateService.getCertificate(certificateId, principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(cert));
    }

    @GetMapping(value = "/certificates/{certificateId}/download", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> downloadCertificate(@PathVariable("certificateId") UUID certificateId) {
        byte[] pdfBytes = certificateService.getCertificatePdfBytes(certificateId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"certificate-" + certificateId + ".pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdfBytes);
    }

    @PostMapping("/certificates/{certificateId}/resend")
    public ResponseEntity<ApiResponse<Void>> resendEmail(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("certificateId") UUID certificateId
    ) {
        certificateService.resendEmail(certificateId, principal.getId());
        return ResponseEntity.ok(ApiResponse.ok("Certificate email resend queued", null));
    }

    @PostMapping("/certificates/{certificateId}/revoke")
    public ResponseEntity<ApiResponse<Void>> revokeCertificate(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("certificateId") UUID certificateId,
            @Valid @RequestBody CertificateDtos.RevokeCertificateRequest request
    ) {
        certificateService.revokeCertificate(certificateId, principal.getId(), request.getReason());
        return ResponseEntity.ok(ApiResponse.ok("Certificate successfully revoked", null));
    }

    @PostMapping("/certificates/{certificateId}/replace")
    public ResponseEntity<ApiResponse<CertificateDtos.CertificateDto>> replaceCertificate(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("certificateId") UUID certificateId,
            @Valid @RequestBody CertificateDtos.ReplaceCertificateRequest request
    ) {
        CertificateDtos.CertificateDto replacement = certificateService.replaceCertificate(certificateId, principal.getId(), request);
        return ResponseEntity.ok(ApiResponse.ok("Replacement certificate created and queued", replacement));
    }
}
