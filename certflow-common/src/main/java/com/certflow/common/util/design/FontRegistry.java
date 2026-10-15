package com.certflow.common.util.design;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Resolves design font families to PDFBox fonts. One instance per PDDocument: fonts are loaded
 * (and subset-embedded) into that document only and must never be shared across documents.
 *
 * TTF files live on the classpath under /fonts/ as {FamilyWithoutSpaces}-{Regular|Bold|Italic|BoldItalic}.ttf.
 * Missing variants fall back to the closest variant of the family, then to Helvetica. Never throws.
 */
public final class FontRegistry {
    private static final Logger log = LoggerFactory.getLogger(FontRegistry.class);

    /** Normalised family key to file prefix. */
    private static final Map<String, String> GOOGLE_FAMILIES = new LinkedHashMap<String, String>();

    static {
        String[] names = {
                "Playfair Display", "Cormorant Garamond", "Libre Baskerville", "Merriweather", "Lora", "Cinzel",
                "Montserrat", "Poppins", "Raleway", "Oswald", "Great Vibes", "Dancing Script", "Pinyon Script",
                "Roboto Mono"
        };
        for (String n : names) {
            GOOGLE_FAMILIES.put(normalise(n), n.replace(" ", ""));
        }
    }

    private final PDDocument document;
    private final Map<String, PDFont> byFile = new HashMap<String, PDFont>();
    private final Set<String> unavailableFiles = new HashSet<String>();
    private final Map<String, PDFont> builtIns = new HashMap<String, PDFont>();
    private final Set<String> warned = new HashSet<String>();

    public FontRegistry(PDDocument document) {
        this.document = document;
    }

    private static String normalise(String s) {
        if (s == null) {
            return "";
        }
        return s.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
    }

    public PDFont resolve(String family, boolean bold, boolean italic) {
        String key = normalise(family);
        if (key.equals("times") || key.equals("timesroman") || key.equals("timesnewroman") || key.equals("serif")) {
            return builtIn("times", bold, italic);
        }
        if (key.equals("courier") || key.equals("couriernew") || key.equals("monospace")) {
            return builtIn("courier", bold, italic);
        }
        String prefix = GOOGLE_FAMILIES.get(key);
        if (prefix == null) {
            // Helvetica, Arial, Sans-Serif and anything unknown.
            if (!key.isEmpty() && !key.equals("helvetica") && !key.equals("arial") && !key.equals("sansserif")) {
                warnOnce("family:" + key, "Unknown font family '" + family + "', using Helvetica");
            }
            return builtIn("helvetica", bold, italic);
        }

        String[] order = variantOrder(bold, italic);
        for (int i = 0; i < order.length; i++) {
            PDFont font = loadFile(prefix + "-" + order[i] + ".ttf");
            if (font != null) {
                if (i > 0) {
                    warnOnce("variant:" + prefix + bold + italic,
                            "Font " + prefix + " has no " + order[0] + " file, using " + order[i]);
                }
                return font;
            }
        }
        warnOnce("family-missing:" + prefix, "No font files found for " + prefix + ", using Helvetica");
        return builtIn("helvetica", bold, italic);
    }

    private static String[] variantOrder(boolean bold, boolean italic) {
        if (bold && italic) {
            return new String[] {"BoldItalic", "Bold", "Italic", "Regular"};
        }
        if (bold) {
            return new String[] {"Bold", "BoldItalic", "Regular", "Italic"};
        }
        if (italic) {
            return new String[] {"Italic", "BoldItalic", "Regular", "Bold"};
        }
        return new String[] {"Regular", "Italic", "Bold", "BoldItalic"};
    }

    private PDFont loadFile(String fileName) {
        PDFont cached = byFile.get(fileName);
        if (cached != null) {
            return cached;
        }
        if (unavailableFiles.contains(fileName)) {
            return null;
        }
        try (InputStream in = FontRegistry.class.getResourceAsStream("/fonts/" + fileName)) {
            if (in == null) {
                unavailableFiles.add(fileName);
                return null;
            }
            PDFont font = PDType0Font.load(document, in, true);
            byFile.put(fileName, font);
            return font;
        } catch (IOException | RuntimeException ex) {
            warnOnce("load:" + fileName, "Could not load font file " + fileName + ": " + ex);
            unavailableFiles.add(fileName);
            return null;
        }
    }

    private PDFont builtIn(String family, boolean bold, boolean italic) {
        String cacheKey = family + "|" + bold + "|" + italic;
        PDFont cached = builtIns.get(cacheKey);
        if (cached != null) {
            return cached;
        }
        Standard14Fonts.FontName name;
        if ("times".equals(family)) {
            if (bold && italic) {
                name = Standard14Fonts.FontName.TIMES_BOLD_ITALIC;
            } else if (bold) {
                name = Standard14Fonts.FontName.TIMES_BOLD;
            } else if (italic) {
                name = Standard14Fonts.FontName.TIMES_ITALIC;
            } else {
                name = Standard14Fonts.FontName.TIMES_ROMAN;
            }
        } else if ("courier".equals(family)) {
            if (bold && italic) {
                name = Standard14Fonts.FontName.COURIER_BOLD_OBLIQUE;
            } else if (bold) {
                name = Standard14Fonts.FontName.COURIER_BOLD;
            } else if (italic) {
                name = Standard14Fonts.FontName.COURIER_OBLIQUE;
            } else {
                name = Standard14Fonts.FontName.COURIER;
            }
        } else {
            if (bold && italic) {
                name = Standard14Fonts.FontName.HELVETICA_BOLD_OBLIQUE;
            } else if (bold) {
                name = Standard14Fonts.FontName.HELVETICA_BOLD;
            } else if (italic) {
                name = Standard14Fonts.FontName.HELVETICA_OBLIQUE;
            } else {
                name = Standard14Fonts.FontName.HELVETICA;
            }
        }
        PDFont font = new PDType1Font(name);
        builtIns.put(cacheKey, font);
        return font;
    }

    private void warnOnce(String key, String message) {
        if (warned.add(key)) {
            log.warn(message);
        }
    }

    /**
     * Returns the text with every character the font cannot encode removed, so that measuring and
     * showText never throw IllegalArgumentException.
     */
    public static String encodable(PDFont font, String text) {
        if (text == null || text.isEmpty()) {
            return "";
        }
        try {
            font.getStringWidth(text);
            return text;
        } catch (IOException | RuntimeException ex) {
            // fall through to per code point filtering
        }
        StringBuilder sb = new StringBuilder();
        int i = 0;
        while (i < text.length()) {
            int cp = text.codePointAt(i);
            i += Character.charCount(cp);
            String one = new String(Character.toChars(cp));
            try {
                font.getStringWidth(one);
                sb.append(one);
            } catch (IOException | RuntimeException ex) {
                // drop the glyph
            }
        }
        return sb.toString();
    }
}
