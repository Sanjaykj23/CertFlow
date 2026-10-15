package com.certflow.common.util.design;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Java port of layoutText() in certflow-frontend/src/lib/designer.ts. Pure maths (no PDFBox) so
 * that browser and server place text identically. Coordinates are in the model space: points from
 * the top-left corner of the page.
 */
public final class TextLayoutMath {

    /** Baseline offset from the line box centre as a fraction of the font size. */
    public static final double BASELINE_FROM_CENTER = 0.32;

    private TextLayoutMath() {}

    public static final class Line {
        public final String text;
        public final double baselineY;

        Line(String text, double baselineY) {
            this.text = text;
            this.baselineY = baselineY;
        }
    }

    public static final class Result {
        public final double anchorX;
        public final double lineHeightPx;
        public final double totalHeight;
        public final List<Line> lines;

        Result(double anchorX, double lineHeightPx, double totalHeight, List<Line> lines) {
            this.anchorX = anchorX;
            this.lineHeightPx = lineHeightPx;
            this.totalHeight = totalHeight;
            this.lines = lines;
        }
    }

    public static Result layout(
            String resolvedText,
            boolean uppercase,
            double x,
            double y,
            double width,
            double height,
            double fontSize,
            double lineHeight,
            String align,
            String valign
    ) {
        String text = resolvedText == null ? "" : resolvedText.replace("\r", "");
        if (uppercase) {
            text = text.toUpperCase(Locale.ROOT);
        }
        String[] raw = text.split("\n", -1);
        double lineHeightPx = fontSize * lineHeight;
        double totalHeight = lineHeightPx * raw.length;
        double top = y;
        String v = valign == null ? "top" : valign.toLowerCase(Locale.ROOT);
        if ("middle".equals(v)) {
            top = y + (height - totalHeight) / 2;
        } else if ("bottom".equals(v)) {
            top = y + height - totalHeight;
        }
        String a = align == null ? "center" : align.toLowerCase(Locale.ROOT);
        double anchorX;
        if ("left".equals(a)) {
            anchorX = x;
        } else if ("right".equals(a)) {
            anchorX = x + width;
        } else {
            anchorX = x + width / 2;
        }
        List<Line> lines = new ArrayList<Line>();
        for (int i = 0; i < raw.length; i++) {
            double baseline = top + i * lineHeightPx + lineHeightPx / 2 + BASELINE_FROM_CENTER * fontSize;
            lines.add(new Line(raw[i], baseline));
        }
        return new Result(anchorX, lineHeightPx, totalHeight, lines);
    }

    /** Left edge of a line of the given width whose alignment anchor is anchorX. */
    public static double lineStartX(double anchorX, String align, double textWidth) {
        String a = align == null ? "center" : align.toLowerCase(Locale.ROOT);
        if ("left".equals(a)) {
            return anchorX;
        }
        if ("right".equals(a)) {
            return anchorX - textWidth;
        }
        return anchorX - textWidth / 2;
    }

    /** Width of a line: advance width plus letterSpacing between characters (n - 1 gaps). */
    public static double lineWidth(double advanceWidth, double letterSpacing, int charCount) {
        return advanceWidth + letterSpacing * Math.max(0, charCount - 1);
    }
}
