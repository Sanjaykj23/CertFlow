package com.certflow.common.util.design;

import java.awt.Color;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Defensive accessors for the loosely typed design document (Jackson gives us Maps, Lists,
 * Integers, Longs and Doubles in any mix).
 */
public final class DesignJson {

    private DesignJson() {}

    public static double num(Object o, double def) {
        if (o instanceof Number) {
            double d = ((Number) o).doubleValue();
            if (Double.isNaN(d) || Double.isInfinite(d)) {
                return def;
            }
            return d;
        }
        if (o instanceof String) {
            try {
                double d = Double.parseDouble(((String) o).trim());
                if (Double.isNaN(d) || Double.isInfinite(d)) {
                    return def;
                }
                return d;
            } catch (NumberFormatException ignored) {
                return def;
            }
        }
        return def;
    }

    public static String str(Object o, String def) {
        return o instanceof String ? (String) o : def;
    }

    public static boolean bool(Object o, boolean def) {
        if (o instanceof Boolean) {
            return (Boolean) o;
        }
        if (o instanceof String) {
            return Boolean.parseBoolean(((String) o).trim());
        }
        return def;
    }

    @SuppressWarnings("unchecked")
    public static Map<String, Object> map(Object o) {
        return o instanceof Map ? (Map<String, Object>) o : null;
    }

    public static List<Object> list(Object o) {
        if (o instanceof List) {
            return new ArrayList<Object>((List<?>) o);
        }
        return new ArrayList<Object>();
    }

    /**
     * Parses #RGB, #RRGGBB (and #RRGGBBAA, alpha ignored). Returns {@code fallback} for anything else,
     * including null, "none" and "transparent".
     */
    public static Color color(Object o, Color fallback) {
        if (!(o instanceof String)) {
            return fallback;
        }
        String s = ((String) o).trim();
        if (s.startsWith("#")) {
            s = s.substring(1);
        }
        try {
            if (s.length() == 3) {
                int r = Integer.parseInt(s.substring(0, 1), 16);
                int g = Integer.parseInt(s.substring(1, 2), 16);
                int b = Integer.parseInt(s.substring(2, 3), 16);
                return new Color(r * 17, g * 17, b * 17);
            }
            if (s.length() == 6 || s.length() == 8) {
                int r = Integer.parseInt(s.substring(0, 2), 16);
                int g = Integer.parseInt(s.substring(2, 4), 16);
                int b = Integer.parseInt(s.substring(4, 6), 16);
                return new Color(r, g, b);
            }
        } catch (NumberFormatException ignored) {
            // fall through
        }
        return fallback;
    }
}
