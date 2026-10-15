package com.certflow.common.domain;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class TemplateLayoutConfig implements Serializable {
    @Builder.Default
    private String orientation = "LANDSCAPE"; // LANDSCAPE or PORTRAIT
    @Builder.Default
    private int width = 842; // A4 Landscape width (pt)
    @Builder.Default
    private int height = 595; // A4 Landscape height (pt)

    @Builder.Default
    private List<TextElement> textElements = new ArrayList<>();

    @Builder.Default
    private QrElement qrCode = new QrElement();

    /**
     * Full "design v2" document written by the web editor (page, background, elements).
     * Kept as a generic map so it round-trips through Jackson untouched. When present the
     * renderer draws this instead of textElements/qrCode.
     */
    private Map<String, Object> design;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TextElement implements Serializable {
        private String id;
        private String placeholder; // e.g. {{participant_name}}, {{event_name}}, {{certificate_id}}, {{issue_date}}, {{organization_name}}, {{certificate_type}}
        private float x;
        private float y;
        private float fontSize;
        private String fontFamily; // Helvetica, Times-Roman, Courier
        private String fontStyle; // NORMAL, BOLD, ITALIC
        private String colorHex; // e.g. #1E293B
        private String alignment; // CENTER, LEFT, RIGHT
        private String defaultValue;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QrElement implements Serializable {
        @Builder.Default
        private boolean enabled = true;
        @Builder.Default
        private float x = 50;
        @Builder.Default
        private float y = 50;
        @Builder.Default
        private float size = 90;
    }
}
