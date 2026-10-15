package com.certflow.common.util.design;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.apache.pdfbox.pdmodel.graphics.state.PDExtendedGraphicsState;
import org.apache.pdfbox.util.Matrix;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Renders a "design v2" document (see certflow-frontend/src/lib/designer.ts) to PDF with PDFBox.
 * Model coordinates are points from the top-left; PDF space is bottom-left, so every y is flipped.
 */
public final class DesignPdfRenderer {
    private static final Logger log = LoggerFactory.getLogger(DesignPdfRenderer.class);

    private static final int GRADIENT_BANDS = 48;
    private static final double KAPPA = 0.5522847498307936;
    private static final int QR_QUIET = 2;
    private static final Pattern PLACEHOLDER = Pattern.compile("\\{\\{\\s*([a-zA-Z_]+)\\s*\\}\\}");

    private DesignPdfRenderer() {}

    @FunctionalInterface
    private interface PathBuilder {
        void build() throws IOException;
    }

    private static final class Stop {
        final double offset;
        final Color color;

        Stop(double offset, Color color) {
            this.offset = offset;
            this.color = color;
        }
    }

    public static byte[] render(Map<String, Object> design, byte[] qrCodeBytes, Map<String, String> placeholders)
            throws IOException {
        double w = DesignJson.num(design.get("width"), 842);
        double h = DesignJson.num(design.get("height"), 595);
        if (w <= 0) {
            w = 842;
        }
        if (h <= 0) {
            h = 595;
        }
        try (PDDocument document = new PDDocument()) {
            PDPage page = new PDPage(new PDRectangle((float) w, (float) h));
            document.addPage(page);
            try (PDPageContentStream cs = new PDPageContentStream(document, page)) {
                Painter painter = new Painter(document, cs, w, h, qrCodeBytes,
                        placeholders == null ? new HashMap<String, String>() : placeholders);
                painter.paint(design);
            }
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            document.save(baos);
            return baos.toByteArray();
        }
    }

    /** Resolves {{tokens}} like resolveText() in certificate.ts; unknown tokens stay as written. */
    static String resolvePlaceholders(String text, Map<String, String> values) {
        Matcher m = PLACEHOLDER.matcher(text);
        StringBuffer sb = new StringBuffer();
        while (m.find()) {
            String key = m.group(1).toLowerCase(Locale.ROOT);
            String replacement = null;
            if (values.containsKey(key)) {
                replacement = values.get(key);
                if (replacement == null) {
                    replacement = "";
                }
            } else if ("date".equals(key) && values.containsKey("issue_date")) {
                replacement = values.get("issue_date");
                if (replacement == null) {
                    replacement = "";
                }
            }
            if (replacement == null) {
                replacement = m.group(0);
            }
            m.appendReplacement(sb, Matcher.quoteReplacement(replacement));
        }
        m.appendTail(sb);
        return sb.toString();
    }

    private static final class Painter {
        private final PDDocument document;
        private final PDPageContentStream cs;
        private final double pageW;
        private final double pageH;
        private final byte[] qrCodeBytes;
        private final Map<String, String> placeholders;
        private final FontRegistry fonts;
        private boolean qrTried = false;
        private boolean[][] qrMatrix = null;
        private int imageCounter = 0;

        Painter(PDDocument document, PDPageContentStream cs, double pageW, double pageH,
                byte[] qrCodeBytes, Map<String, String> placeholders) {
            this.document = document;
            this.cs = cs;
            this.pageW = pageW;
            this.pageH = pageH;
            this.qrCodeBytes = qrCodeBytes;
            this.placeholders = placeholders;
            this.fonts = new FontRegistry(document);
        }

        void paint(Map<String, Object> design) throws IOException {
            drawBackground(DesignJson.map(design.get("background")));
            List<Object> elements = DesignJson.list(design.get("elements"));
            for (Object o : elements) {
                Map<String, Object> el = DesignJson.map(o);
                if (el == null || DesignJson.bool(el.get("hidden"), false)) {
                    continue;
                }
                try {
                    drawElement(el);
                } catch (IOException | RuntimeException ex) {
                    log.warn("Skipping design element {} after error: {}", el.get("id"), ex.toString());
                }
            }
        }

        // ------------------------------------------------------------ helpers

        private float fy(double modelY) {
            return (float) (pageH - modelY);
        }

        private void applyAlpha(double alpha) throws IOException {
            if (alpha >= 0.999) {
                return;
            }
            float a = (float) Math.max(0.0, Math.min(1.0, alpha));
            PDExtendedGraphicsState gs = new PDExtendedGraphicsState();
            gs.setNonStrokingAlphaConstant(a);
            gs.setStrokingAlphaConstant(a);
            cs.setGraphicsStateParameters(gs);
        }

        private void pageRectPath() throws IOException {
            cs.addRect(0f, 0f, (float) pageW, (float) pageH);
        }

        /** Rounded rectangle path in model coordinates. */
        private void roundedRect(double x, double y, double w, double h, double radius) throws IOException {
            double r = Math.max(0, Math.min(radius, Math.min(w, h) / 2));
            double left = x;
            double right = x + w;
            double top = pageH - y;
            double bottom = pageH - y - h;
            if (r <= 0) {
                cs.addRect((float) left, (float) bottom, (float) w, (float) h);
                return;
            }
            double k = KAPPA * r;
            cs.moveTo((float) (left + r), (float) top);
            cs.lineTo((float) (right - r), (float) top);
            cs.curveTo((float) (right - r + k), (float) top, (float) right, (float) (top - r + k),
                    (float) right, (float) (top - r));
            cs.lineTo((float) right, (float) (bottom + r));
            cs.curveTo((float) right, (float) (bottom + r - k), (float) (right - r + k), (float) bottom,
                    (float) (right - r), (float) bottom);
            cs.lineTo((float) (left + r), (float) bottom);
            cs.curveTo((float) (left + r - k), (float) bottom, (float) left, (float) (bottom + r - k),
                    (float) left, (float) (bottom + r));
            cs.lineTo((float) left, (float) (top - r));
            cs.curveTo((float) left, (float) (top - r + k), (float) (left + r - k), (float) top,
                    (float) (left + r), (float) top);
            cs.closePath();
        }

        private void ellipsePath(double x, double y, double w, double h) throws IOException {
            double rx = w / 2;
            double ry = h / 2;
            double cx = x + rx;
            double cy = pageH - (y + ry);
            double kx = KAPPA * rx;
            double ky = KAPPA * ry;
            cs.moveTo((float) (cx + rx), (float) cy);
            cs.curveTo((float) (cx + rx), (float) (cy + ky), (float) (cx + kx), (float) (cy + ry),
                    (float) cx, (float) (cy + ry));
            cs.curveTo((float) (cx - kx), (float) (cy + ry), (float) (cx - rx), (float) (cy + ky),
                    (float) (cx - rx), (float) cy);
            cs.curveTo((float) (cx - rx), (float) (cy - ky), (float) (cx - kx), (float) (cy - ry),
                    (float) cx, (float) (cy - ry));
            cs.curveTo((float) (cx + kx), (float) (cy - ry), (float) (cx + rx), (float) (cy - ky),
                    (float) (cx + rx), (float) cy);
            cs.closePath();
        }

        // ------------------------------------------------------------ fills

        private List<Stop> parseStops(Map<String, Object> fill) {
            List<Stop> stops = new ArrayList<Stop>();
            for (Object o : DesignJson.list(fill.get("stops"))) {
                Map<String, Object> s = DesignJson.map(o);
                if (s == null) {
                    continue;
                }
                Color c = DesignJson.color(s.get("color"), null);
                if (c == null) {
                    continue;
                }
                stops.add(new Stop(DesignJson.num(s.get("offset"), 0), c));
            }
            Collections.sort(stops, new Comparator<Stop>() {
                @Override
                public int compare(Stop a, Stop b) {
                    return Double.compare(a.offset, b.offset);
                }
            });
            return stops;
        }

        private Color colorAt(List<Stop> stops, double t) {
            Stop first = stops.get(0);
            if (t <= first.offset) {
                return first.color;
            }
            for (int i = 1; i < stops.size(); i++) {
                Stop a = stops.get(i - 1);
                Stop b = stops.get(i);
                if (t <= b.offset) {
                    double span = b.offset - a.offset;
                    double f = span <= 0 ? 1 : (t - a.offset) / span;
                    int r = (int) Math.round(a.color.getRed() + (b.color.getRed() - a.color.getRed()) * f);
                    int g = (int) Math.round(a.color.getGreen() + (b.color.getGreen() - a.color.getGreen()) * f);
                    int bl = (int) Math.round(a.color.getBlue() + (b.color.getBlue() - a.color.getBlue()) * f);
                    return new Color(clamp255(r), clamp255(g), clamp255(bl));
                }
            }
            return stops.get(stops.size() - 1).color;
        }

        private int clamp255(int v) {
            return Math.max(0, Math.min(255, v));
        }

        /** Fills the shape with a solid colour or a banded linear gradient over the box x,y,w,h. */
        private void fillShape(Map<String, Object> fill, double x, double y, double w, double h, PathBuilder shape)
                throws IOException {
            if (fill == null) {
                return;
            }
            String kind = DesignJson.str(fill.get("kind"), "solid");
            if ("linear".equals(kind)) {
                List<Stop> stops = parseStops(fill);
                if (stops.isEmpty()) {
                    return;
                }
                if (stops.size() == 1) {
                    cs.setNonStrokingColor(stops.get(0).color);
                    shape.build();
                    cs.fill();
                    return;
                }
                drawGradient(stops, DesignJson.num(fill.get("angle"), 180), x, y, w, h, shape);
                return;
            }
            Color c = DesignJson.color(fill.get("color"), null);
            if (c == null) {
                return;
            }
            cs.setNonStrokingColor(c);
            shape.build();
            cs.fill();
        }

        private void drawGradient(List<Stop> stops, double angle, double x, double y, double w, double h,
                                  PathBuilder shape) throws IOException {
            double a = Math.toRadians(angle);
            double dx = Math.sin(a);
            double dy = -Math.cos(a);
            double len = Math.abs(w * dx) + Math.abs(h * dy);
            double cx = x + w / 2;
            double cy = y + h / 2;
            double x1 = cx - dx * len / 2;
            double y1 = cy - dy * len / 2;
            double px = -dy;
            double py = dx;
            double ext = Math.hypot(w, h);
            double step = 1.0 / GRADIENT_BANDS;

            cs.saveGraphicsState();
            try {
                shape.build();
                cs.clip();
                for (int i = 0; i < GRADIENT_BANDS; i++) {
                    double t0 = i * step;
                    double t1 = (i + 1) * step;
                    Color c = colorAt(stops, (t0 + t1) / 2);
                    double s0 = (i == 0) ? -0.05 : t0;
                    double s1 = (i == GRADIENT_BANDS - 1) ? 1.05 : t1 + step * 0.6;
                    double ax = x1 + dx * len * s0;
                    double ay = y1 + dy * len * s0;
                    double bx = x1 + dx * len * s1;
                    double by = y1 + dy * len * s1;
                    cs.setNonStrokingColor(c);
                    cs.moveTo((float) (ax + px * ext), fy(ay + py * ext));
                    cs.lineTo((float) (bx + px * ext), fy(by + py * ext));
                    cs.lineTo((float) (bx - px * ext), fy(by - py * ext));
                    cs.lineTo((float) (ax - px * ext), fy(ay - py * ext));
                    cs.closePath();
                    cs.fill();
                }
            } finally {
                cs.restoreGraphicsState();
            }
        }

        private void applyDash(String dash, double sw, String cap) throws IOException {
            if ("dashed".equals(dash)) {
                cs.setLineDashPattern(new float[] {(float) (4 * sw), (float) (3 * sw)}, 0f);
                cs.setLineCapStyle(0);
            } else if ("dotted".equals(dash)) {
                cs.setLineDashPattern(new float[] {1f, (float) (2 * sw)}, 0f);
                cs.setLineCapStyle(1);
            } else {
                cs.setLineDashPattern(new float[] {}, 0f);
                cs.setLineCapStyle("round".equals(cap) ? 1 : 0);
            }
        }

        private void strokeShape(Map<String, Object> el, PathBuilder shape) throws IOException {
            Color sc = DesignJson.color(el.get("stroke"), null);
            double sw = DesignJson.num(el.get("strokeWidth"), 2);
            if (sc == null || sw <= 0) {
                return;
            }
            cs.setStrokingColor(sc);
            cs.setLineWidth((float) sw);
            applyDash(DesignJson.str(el.get("dash"), "solid"), sw, "butt");
            shape.build();
            cs.stroke();
        }

        // ------------------------------------------------------------ background

        private void drawBackground(Map<String, Object> bg) throws IOException {
            Map<String, Object> fill = bg == null ? null : DesignJson.map(bg.get("fill"));
            if (bg == null || fill == null) {
                cs.setNonStrokingColor(Color.WHITE);
                pageRectPath();
                cs.fill();
            } else {
                fillShape(fill, 0, 0, pageW, pageH, new PathBuilder() {
                    @Override
                    public void build() throws IOException {
                        pageRectPath();
                    }
                });
            }
            Map<String, Object> image = bg == null ? null : DesignJson.map(bg.get("image"));
            if (image == null) {
                return;
            }
            PDImageXObject img = loadImage(DesignJson.str(image.get("src"), null));
            if (img == null) {
                return;
            }
            cs.saveGraphicsState();
            try {
                applyAlpha(DesignJson.num(image.get("opacity"), 1));
                drawImageFit(img, 0, 0, pageW, pageH, DesignJson.str(image.get("fit"), "cover"), 0);
            } finally {
                cs.restoreGraphicsState();
            }
        }

        // ------------------------------------------------------------ elements

        private void drawElement(Map<String, Object> el) throws IOException {
            String type = DesignJson.str(el.get("type"), "");
            if (!"text".equals(type) && !"rect".equals(type) && !"ellipse".equals(type) && !"line".equals(type)
                    && !"image".equals(type) && !"qr".equals(type)) {
                log.debug("Ignoring unknown design element type '{}'", type);
                return;
            }
            double x = DesignJson.num(el.get("x"), 0);
            double y = DesignJson.num(el.get("y"), 0);
            double w = DesignJson.num(el.get("width"), 0);
            double h = DesignJson.num(el.get("height"), 0);
            double rotation = DesignJson.num(el.get("rotation"), 0);
            double opacity = DesignJson.num(el.get("opacity"), 1);

            cs.saveGraphicsState();
            try {
                if (rotation != 0) {
                    // Model rotation is clockwise on a y-down page: counter-clockwise by -rotation in PDF space.
                    float cx = (float) (x + w / 2);
                    float cy = fy(y + h / 2);
                    cs.transform(Matrix.getTranslateInstance(cx, cy));
                    cs.transform(Matrix.getRotateInstance(-Math.toRadians(rotation), 0f, 0f));
                    cs.transform(Matrix.getTranslateInstance(-cx, -cy));
                }
                applyAlpha(opacity);

                if ("text".equals(type)) {
                    drawText(el, x, y, w, h);
                } else if ("rect".equals(type)) {
                    drawRect(el, x, y, w, h);
                } else if ("ellipse".equals(type)) {
                    drawEllipse(el, x, y, w, h);
                } else if ("line".equals(type)) {
                    drawLine(el, x, y, w);
                } else if ("image".equals(type)) {
                    drawImageElement(el, x, y, w, h);
                } else {
                    drawQr(el, x, y, w, h);
                }
            } finally {
                cs.restoreGraphicsState();
            }
        }

        private void drawRect(Map<String, Object> el, final double x, final double y, final double w, final double h)
                throws IOException {
            final double radius = DesignJson.num(el.get("cornerRadius"), 0);
            PathBuilder shape = new PathBuilder() {
                @Override
                public void build() throws IOException {
                    roundedRect(x, y, w, h, radius);
                }
            };
            fillShape(DesignJson.map(el.get("fill")), x, y, w, h, shape);
            strokeShape(el, shape);
        }

        private void drawEllipse(Map<String, Object> el, final double x, final double y, final double w,
                                 final double h) throws IOException {
            PathBuilder shape = new PathBuilder() {
                @Override
                public void build() throws IOException {
                    ellipsePath(x, y, w, h);
                }
            };
            fillShape(DesignJson.map(el.get("fill")), x, y, w, h, shape);
            strokeShape(el, shape);
        }

        private void drawLine(Map<String, Object> el, double x, double y, double w) throws IOException {
            Color sc = DesignJson.color(el.get("stroke"), Color.BLACK);
            double sw = DesignJson.num(el.get("strokeWidth"), 2);
            if (sw <= 0) {
                return;
            }
            cs.setStrokingColor(sc);
            cs.setLineWidth((float) sw);
            applyDash(DesignJson.str(el.get("dash"), "solid"), sw, DesignJson.str(el.get("cap"), "butt"));
            cs.moveTo((float) x, fy(y));
            cs.lineTo((float) (x + w), fy(y));
            cs.stroke();
        }

        private void drawText(Map<String, Object> el, double x, double y, double w, double h) throws IOException {
            String raw = DesignJson.str(el.get("text"), "");
            String resolved = resolvePlaceholders(raw, placeholders);
            double fontSize = DesignJson.num(el.get("fontSize"), 24);
            if (fontSize <= 0) {
                return;
            }
            double lineHeight = DesignJson.num(el.get("lineHeight"), 1.2);
            double letterSpacing = DesignJson.num(el.get("letterSpacing"), 0);
            String align = DesignJson.str(el.get("align"), "center");
            String valign = DesignJson.str(el.get("valign"), "top");
            boolean underline = DesignJson.bool(el.get("underline"), false);
            Color color = DesignJson.color(el.get("color"), Color.BLACK);
            PDFont font = fonts.resolve(DesignJson.str(el.get("fontFamily"), "Helvetica"),
                    DesignJson.bool(el.get("bold"), false), DesignJson.bool(el.get("italic"), false));

            TextLayoutMath.Result lay = TextLayoutMath.layout(resolved,
                    DesignJson.bool(el.get("uppercase"), false), x, y, w, h, fontSize, lineHeight, align, valign);

            for (TextLayoutMath.Line line : lay.lines) {
                String text = FontRegistry.encodable(font, line.text.replace("\t", " "));
                if (text.isEmpty()) {
                    continue;
                }
                double advance = font.getStringWidth(text) / 1000.0 * fontSize;
                double textWidth = TextLayoutMath.lineWidth(advance, letterSpacing, text.codePointCount(0, text.length()));
                double startX = TextLayoutMath.lineStartX(lay.anchorX, align, textWidth);

                cs.beginText();
                cs.setFont(font, (float) fontSize);
                cs.setNonStrokingColor(color);
                cs.setCharacterSpacing((float) letterSpacing);
                cs.newLineAtOffset((float) startX, fy(line.baselineY));
                cs.showText(text);
                cs.endText();

                if (underline) {
                    double uy = line.baselineY + 0.08 * fontSize;
                    cs.setStrokingColor(color);
                    cs.setLineWidth((float) Math.max(0.5, fontSize * 0.05));
                    cs.setLineDashPattern(new float[] {}, 0f);
                    cs.moveTo((float) startX, fy(uy));
                    cs.lineTo((float) (startX + textWidth), fy(uy));
                    cs.stroke();
                }
            }
        }

        // ------------------------------------------------------------ images

        private PDImageXObject loadImage(String src) {
            if (src == null || !src.startsWith("data:")) {
                log.warn("Design image skipped: only data: URIs are supported");
                return null;
            }
            int comma = src.indexOf(',');
            if (comma < 0) {
                log.warn("Design image skipped: malformed data URI");
                return null;
            }
            String meta = src.substring(5, comma).toLowerCase(Locale.ROOT);
            if (meta.contains("svg")) {
                log.warn("Design image skipped: SVG images are not supported by the PDF renderer");
                return null;
            }
            if (!meta.contains("base64")) {
                log.warn("Design image skipped: data URI is not base64 encoded");
                return null;
            }
            try {
                byte[] bytes = Base64.getMimeDecoder().decode(src.substring(comma + 1));
                imageCounter++;
                return PDImageXObject.createFromByteArray(document, bytes, "design-img-" + imageCounter);
            } catch (IOException | RuntimeException ex) {
                log.warn("Design image skipped: could not decode image ({})", ex.toString());
                return null;
            }
        }

        private void drawImageFit(PDImageXObject img, double x, double y, double w, double h, String fit,
                                  double radius) throws IOException {
            double iw = img.getWidth();
            double ih = img.getHeight();
            if (iw <= 0 || ih <= 0 || w <= 0 || h <= 0) {
                return;
            }
            double dw = w;
            double dh = h;
            if ("contain".equals(fit)) {
                double s = Math.min(w / iw, h / ih);
                dw = iw * s;
                dh = ih * s;
            } else if ("cover".equals(fit)) {
                double s = Math.max(w / iw, h / ih);
                dw = iw * s;
                dh = ih * s;
            }
            double dx = x + (w - dw) / 2;
            double dy = y + (h - dh) / 2;
            boolean clip = "cover".equals(fit) || radius > 0;
            cs.saveGraphicsState();
            try {
                if (clip) {
                    roundedRect(x, y, w, h, radius);
                    cs.clip();
                }
                cs.drawImage(img, (float) dx, (float) (pageH - dy - dh), (float) dw, (float) dh);
            } finally {
                cs.restoreGraphicsState();
            }
        }

        private void drawImageElement(Map<String, Object> el, double x, double y, double w, double h)
                throws IOException {
            PDImageXObject img = loadImage(DesignJson.str(el.get("src"), null));
            if (img == null) {
                return;
            }
            drawImageFit(img, x, y, w, h, DesignJson.str(el.get("fit"), "contain"),
                    DesignJson.num(el.get("cornerRadius"), 0));
        }

        // ------------------------------------------------------------ QR

        private void drawQr(Map<String, Object> el, double x, double y, double w, double h) throws IOException {
            if (qrCodeBytes == null || qrCodeBytes.length == 0) {
                return;
            }
            if (!qrTried) {
                qrTried = true;
                qrMatrix = QrModules.fromPng(qrCodeBytes);
            }
            if (qrMatrix == null) {
                PDImageXObject img = PDImageXObject.createFromByteArray(document, qrCodeBytes, "design-qr");
                drawImageFit(img, x, y, w, h, "contain", 0);
                return;
            }
            Color bg = DesignJson.color(el.get("bg"), null);
            Color fg = DesignJson.color(el.get("fg"), new Color(0x0F, 0x1A, 0x2B));
            if (bg != null) {
                cs.setNonStrokingColor(bg);
                cs.addRect((float) x, fy(y + h), (float) w, (float) h);
                cs.fill();
            }
            int n = qrMatrix.length;
            double size = Math.min(w, h);
            double cell = size / (n + 2 * QR_QUIET);
            double ox = x + QR_QUIET * cell;
            double oy = y + QR_QUIET * cell;
            double e = cell + 0.15;
            cs.setNonStrokingColor(fg);
            for (int r = 0; r < n; r++) {
                for (int c = 0; c < qrMatrix[r].length; c++) {
                    if (qrMatrix[r][c]) {
                        cs.addRect((float) (ox + c * cell), fy(oy + r * cell + e), (float) e, (float) e);
                    }
                }
            }
            cs.fill();
        }
    }
}
