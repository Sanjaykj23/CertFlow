package com.certflow.common.util;

import com.certflow.common.domain.TemplateLayoutConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class PdfBoxRendererTest {

    @Test
    @DisplayName("Should render valid non-empty PDF document with placeholders and QR code")
    void testRenderPdf() throws IOException {
        TemplateLayoutConfig layout = DefaultTemplateLayoutFactory.createDefaultLandscapeLayout();
        byte[] qrBytes = QrCodeGenerator.generateQrCodePng("https://certflow.io/verify/test-token", 150, 150);

        Map<String, String> placeholders = new HashMap<>();
        placeholders.put("participant_name", "Ada Lovelace");
        placeholders.put("event_name", "Pioneers in Computing 2026");
        placeholders.put("organization_name", "CertFlow Foundation");
        placeholders.put("certificate_type", "Honoree");
        placeholders.put("certificate_id", "CF-2026-ADA1-0001");
        placeholders.put("issue_date", "2026-09-28");

        byte[] pdfBytes = PdfBoxRenderer.renderCertificatePdf(layout, null, qrBytes, placeholders);

        assertNotNull(pdfBytes);
        assertTrue(pdfBytes.length > 1000, "Generated PDF should have realistic byte size");

        // Verify PDF Magic Bytes (%PDF-)
        String header = new String(pdfBytes, 0, Math.min(pdfBytes.length, 8), StandardCharsets.US_ASCII);
        assertTrue(header.startsWith("%PDF-"), "File must start with standard PDF magic header");
    }
}
