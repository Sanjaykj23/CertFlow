package com.certflow.common.util;

import com.certflow.common.domain.TemplateLayoutConfig;
import com.certflow.common.util.design.DesignPdfRenderer;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Map;

public final class PdfBoxRenderer {
    private static final Logger log = LoggerFactory.getLogger(PdfBoxRenderer.class);

    private PdfBoxRenderer() {}

    public static byte[] renderCertificatePdf(
            TemplateLayoutConfig layout,
            byte[] backgroundBytes,
            byte[] qrCodeBytes,
            Map<String, String> placeholders
    ) throws IOException {
        if (layout == null) {
            layout = new TemplateLayoutConfig();
        }

        // Design v2 (web editor): rendered by the dedicated design renderer.
        if (layout.getDesign() != null && !layout.getDesign().isEmpty()) {
            return DesignPdfRenderer.render(layout.getDesign(), qrCodeBytes, placeholders);
        }

        int width = layout.getWidth() > 0 ? layout.getWidth() : 842;
        int height = layout.getHeight() > 0 ? layout.getHeight() : 595;
        PDRectangle pageSize = new PDRectangle(width, height);

        try (PDDocument document = new PDDocument()) {
            PDPage page = new PDPage(pageSize);
            document.addPage(page);

            try (PDPageContentStream cs = new PDPageContentStream(document, page)) {
                // 1. Draw Background Image or Default Elegant Frame
                if (backgroundBytes != null && backgroundBytes.length > 0) {
                    try {
                        PDImageXObject bgImage = PDImageXObject.createFromByteArray(document, backgroundBytes, "bg");
                        cs.drawImage(bgImage, 0, 0, width, height);
                    } catch (Exception ex) {
                        log.warn("Failed to draw background image, drawing fallback frame", ex);
                        drawDefaultBorder(cs, width, height);
                    }
                } else {
                    drawDefaultBorder(cs, width, height);
                }

                // 2. Draw QR Code if enabled and provided
                if (layout.getQrCode() != null && layout.getQrCode().isEnabled() && qrCodeBytes != null && qrCodeBytes.length > 0) {
                    try {
                        PDImageXObject qrImage = PDImageXObject.createFromByteArray(document, qrCodeBytes, "qr");
                        float qrX = layout.getQrCode().getX();
                        float qrY = height - layout.getQrCode().getY() - layout.getQrCode().getSize();
                        float qrSize = layout.getQrCode().getSize();
                        cs.drawImage(qrImage, qrX, qrY, qrSize, qrSize);
                    } catch (Exception ex) {
                        log.warn("Failed to render QR code on PDF", ex);
                    }
                }

                // 3. Render Text Elements with Placeholder Replacement
                if (layout.getTextElements() != null) {
                    for (TemplateLayoutConfig.TextElement elem : layout.getTextElements()) {
                        renderTextElement(cs, elem, placeholders, width, height);
                    }
                }
            }

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            document.save(baos);
            return baos.toByteArray();
        }
    }

    private static void renderTextElement(
            PDPageContentStream cs,
            TemplateLayoutConfig.TextElement elem,
            Map<String, String> placeholders,
            float pageWidth,
            float pageHeight
    ) throws IOException {
        String text = elem.getPlaceholder();
        if (text == null || text.isBlank()) {
            text = elem.getDefaultValue() != null ? elem.getDefaultValue() : "";
        }

        // Replace all placeholders like {{participant_name}}
        for (Map.Entry<String, String> entry : placeholders.entrySet()) {
            String key = entry.getKey();
            String val = entry.getValue() != null ? entry.getValue() : "";
            text = text.replace("{{" + key + "}}", val);
            text = text.replace("{" + key + "}", val);
        }

        if (text.isBlank()) {
            return;
        }

        // Resolve Font
        PDFont font = resolveFont(elem.getFontFamily(), elem.getFontStyle());
        float fontSize = elem.getFontSize() > 0 ? elem.getFontSize() : 14f;

        // Resolve Color
        Color color = parseColor(elem.getColorHex());

        // Invert Y coordinate (PDFBox coordinate system starts at bottom-left)
        float pdfY = pageHeight - elem.getY();

        // Calculate Text Width for Alignment
        float textWidth = (font.getStringWidth(text) / 1000f) * fontSize;
        float pdfX = elem.getX();

        if ("CENTER".equalsIgnoreCase(elem.getAlignment())) {
            pdfX = elem.getX() - (textWidth / 2f);
        } else if ("RIGHT".equalsIgnoreCase(elem.getAlignment())) {
            pdfX = elem.getX() - textWidth;
        }

        // Keep inside page boundaries
        if (pdfX < 10) pdfX = 10;

        cs.beginText();
        cs.setFont(font, fontSize);
        cs.setNonStrokingColor(color);
        cs.newLineAtOffset(pdfX, pdfY);
        cs.showText(text);
        cs.endText();
    }

    private static PDFont resolveFont(String family, String style) {
        boolean isBold = "BOLD".equalsIgnoreCase(style);
        boolean isItalic = "ITALIC".equalsIgnoreCase(style);

        if ("Times-Roman".equalsIgnoreCase(family) || "Serif".equalsIgnoreCase(family)) {
            if (isBold && isItalic) return new PDType1Font(Standard14Fonts.FontName.TIMES_BOLD_ITALIC);
            if (isBold) return new PDType1Font(Standard14Fonts.FontName.TIMES_BOLD);
            if (isItalic) return new PDType1Font(Standard14Fonts.FontName.TIMES_ITALIC);
            return new PDType1Font(Standard14Fonts.FontName.TIMES_ROMAN);
        } else if ("Courier".equalsIgnoreCase(family) || "Monospace".equalsIgnoreCase(family)) {
            if (isBold && isItalic) return new PDType1Font(Standard14Fonts.FontName.COURIER_BOLD);
            if (isBold) return new PDType1Font(Standard14Fonts.FontName.COURIER_BOLD);
            if (isItalic) return new PDType1Font(Standard14Fonts.FontName.COURIER_OBLIQUE);
            return new PDType1Font(Standard14Fonts.FontName.COURIER);
        } else {
            // Default to Helvetica (Sans-serif)
            if (isBold && isItalic) return new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD_OBLIQUE);
            if (isBold) return new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
            if (isItalic) return new PDType1Font(Standard14Fonts.FontName.HELVETICA_OBLIQUE);
            return new PDType1Font(Standard14Fonts.FontName.HELVETICA);
        }
    }

    private static Color parseColor(String hex) {
        if (hex == null || hex.isBlank()) {
            return new Color(30, 41, 59); // Slate-800 default
        }
        try {
            String clean = hex.startsWith("#") ? hex.substring(1) : hex;
            if (clean.length() == 6) {
                return new Color(
                        Integer.parseInt(clean.substring(0, 2), 16),
                        Integer.parseInt(clean.substring(2, 4), 16),
                        Integer.parseInt(clean.substring(4, 6), 16)
                );
            }
        } catch (Exception ignored) {}
        return Color.BLACK;
    }

    private static void drawDefaultBorder(PDPageContentStream cs, float width, float height) throws IOException {
        // Outer background
        cs.setNonStrokingColor(new Color(248, 250, 252)); // Light slate-50
        cs.addRect(0, 0, width, height);
        cs.fill();

        // Inner white canvas
        float margin = 24;
        cs.setNonStrokingColor(Color.WHITE);
        cs.addRect(margin, margin, width - (margin * 2), height - (margin * 2));
        cs.fill();

        // Outer Dark Border
        cs.setStrokingColor(new Color(15, 23, 42)); // Slate-900
        cs.setLineWidth(3.0f);
        cs.addRect(margin, margin, width - (margin * 2), height - (margin * 2));
        cs.stroke();

        // Inner Gold Trim
        float innerMargin = margin + 8;
        cs.setStrokingColor(new Color(217, 119, 6)); // Amber-600 gold trim
        cs.setLineWidth(1.2f);
        cs.addRect(innerMargin, innerMargin, width - (innerMargin * 2), height - (innerMargin * 2));
        cs.stroke();
    }
}
