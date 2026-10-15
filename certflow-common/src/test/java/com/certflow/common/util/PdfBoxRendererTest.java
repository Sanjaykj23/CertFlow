package com.certflow.common.util;

import com.certflow.common.domain.TemplateLayoutConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
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

    // ------------------------------------------------------------------ design v2

    private static Map<String, Object> obj(Object... kv) {
        Map<String, Object> m = new LinkedHashMap<>();
        for (int i = 0; i + 1 < kv.length; i += 2) {
            m.put((String) kv[i], kv[i + 1]);
        }
        return m;
    }

    private static Map<String, Object> base(String type, double x, double y, double w, double h) {
        return obj("id", type + "-1", "type", type, "x", x, "y", y, "width", w, "height", h,
                "rotation", 0, "opacity", 1, "locked", false, "hidden", false);
    }

    private static Map<String, Object> gradient() {
        List<Object> stops = new ArrayList<>();
        stops.add(obj("offset", 0, "color", "#12877F"));
        stops.add(obj("offset", 1, "color", "#c28a1b"));
        return obj("kind", "linear", "angle", 135, "stops", stops);
    }

    private static String pngDataUri() throws IOException {
        BufferedImage img = new BufferedImage(8, 4, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(img, "PNG", out);
        return "data:image/png;base64," + Base64.getEncoder().encodeToString(out.toByteArray());
    }

    private static Map<String, String> samplePlaceholders() {
        Map<String, String> placeholders = new HashMap<>();
        placeholders.put("participant_name", "Ada Lovelace");
        placeholders.put("event_name", "Pioneers in Computing 2026");
        placeholders.put("organization_name", "CertFlow Foundation");
        placeholders.put("certificate_type", "Honoree");
        placeholders.put("certificate_number", "CF-2026-ADA1-0001");
        placeholders.put("issue_date", "2026-09-28");
        return placeholders;
    }

    private static void assertPdf(byte[] pdfBytes) {
        assertNotNull(pdfBytes);
        assertTrue(pdfBytes.length > 500, "Generated PDF should not be empty");
        String header = new String(pdfBytes, 0, Math.min(pdfBytes.length, 8), StandardCharsets.US_ASCII);
        assertTrue(header.startsWith("%PDF-"), "File must start with standard PDF magic header");
    }

    @Test
    @DisplayName("Should render a design v2 with one element of each type")
    void testRenderDesignAllElementTypes() throws IOException {
        Map<String, Object> text = base("text", 100, 120, 642, 60);
        text.put("text", "{{participant_name}}\nline two");
        text.put("fontFamily", "Playfair Display");
        text.put("fontSize", 36);
        text.put("bold", true);
        text.put("italic", true);
        text.put("underline", true);
        text.put("uppercase", true);
        text.put("color", "#0f1a2b");
        text.put("align", "center");
        text.put("valign", "middle");
        text.put("lineHeight", 1.2);
        text.put("letterSpacing", 2);
        text.put("rotation", 10);
        text.put("opacity", 0.8);

        Map<String, Object> rect = base("rect", 50, 50, 200, 100);
        rect.put("fill", gradient());
        rect.put("stroke", "#000");
        rect.put("strokeWidth", 2);
        rect.put("dash", "dashed");
        rect.put("cornerRadius", 12);

        Map<String, Object> ellipse = base("ellipse", 300, 300, 140, 100);
        ellipse.put("fill", obj("kind", "solid", "color", "#C28A1B"));
        ellipse.put("stroke", "#123456");
        ellipse.put("strokeWidth", 3);
        ellipse.put("dash", "dotted");

        Map<String, Object> line = base("line", 100, 500, 300, 0);
        line.put("stroke", "#0F1A2B");
        line.put("strokeWidth", 2);
        line.put("dash", "solid");
        line.put("cap", "round");

        Map<String, Object> image = base("image", 600, 300, 160, 80);
        image.put("src", pngDataUri());
        image.put("fit", "cover");
        image.put("cornerRadius", 8);

        Map<String, Object> qr = base("qr", 700, 450, 90, 90);
        qr.put("fg", "#0F1A2B");
        qr.put("bg", "#FFFFFF");

        Map<String, Object> hidden = base("text", 0, 0, 100, 20);
        hidden.put("text", "never drawn");
        hidden.put("hidden", true);

        List<Object> elements = new ArrayList<>();
        elements.add(rect);
        elements.add(ellipse);
        elements.add(line);
        elements.add(image);
        elements.add(text);
        elements.add(qr);
        elements.add(hidden);

        Map<String, Object> design = obj("version", 2, "width", 842, "height", 595,
                "background", obj("fill", gradient(), "image", obj("src", pngDataUri(), "fit", "fill", "opacity", 0.5)),
                "elements", elements);

        TemplateLayoutConfig layout = new TemplateLayoutConfig();
        layout.setDesign(design);
        byte[] qrBytes = QrCodeGenerator.generateQrCodePng("https://certflow.io/verify/test-token", 150, 150);

        assertPdf(PdfBoxRenderer.renderCertificatePdf(layout, null, qrBytes, samplePlaceholders()));
    }

    @Test
    @DisplayName("Should tolerate a sparse design with unknown values and missing fonts")
    void testRenderDesignDefensive() throws IOException {
        Map<String, Object> text = base("text", 10, 10, 200, 30);
        text.put("text", "Hello {{unknown_token}}");
        text.put("fontFamily", "No Such Font");
        text.put("fontSize", 20L);
        text.put("color", "not-a-colour");

        List<Object> elements = new ArrayList<>();
        elements.add(text);
        elements.add(obj("type", "mystery"));
        elements.add("not even a map");

        Map<String, Object> design = obj("version", 2, "width", 600L, "height", 600.0, "elements", elements);
        TemplateLayoutConfig layout = new TemplateLayoutConfig();
        layout.setDesign(design);

        assertPdf(PdfBoxRenderer.renderCertificatePdf(layout, null, null, samplePlaceholders()));
    }

    @Test
    @DisplayName("Legacy layout without a design still renders through the legacy path")
    void testLegacyLayoutStillRenders() throws IOException {
        TemplateLayoutConfig layout = DefaultTemplateLayoutFactory.createDefaultLandscapeLayout();
        assertNull(layout.getDesign());
        assertPdf(PdfBoxRenderer.renderCertificatePdf(layout, null, null, samplePlaceholders()));
    }

    @Test
    @DisplayName("Builder keeps defaults when design is added")
    void testBuilderDefaults() {
        TemplateLayoutConfig layout = TemplateLayoutConfig.builder().build();
        assertEquals(842, layout.getWidth());
        assertNotNull(layout.getTextElements());
        assertNotNull(layout.getQrCode());
        assertNull(layout.getDesign());
    }
}
