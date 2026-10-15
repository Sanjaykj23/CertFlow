package com.certflow.common.util;

import java.security.SecureRandom;
import java.time.Year;
import java.util.Base64;
import java.util.Locale;

public final class TokenGenerator {
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final char[] ALPHANUMERIC = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ".toCharArray();

    private TokenGenerator() {}

    /**
     * Generates a 256-bit cryptographically secure, unguessable URL-safe verification token.
     */
    public static String generateVerificationToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    /**
     * Generates a human-friendly unique Certificate Number, e.g. CF-2026-X9K2-7MPQ
     */
    public static String generateCertificateNumber(String prefix) {
        String cleanPrefix = (prefix != null && !prefix.isBlank())
                ? prefix.replaceAll("[^a-zA-Z0-9]", "").toUpperCase(Locale.ROOT)
                : "CF";
        if (cleanPrefix.length() > 4) {
            cleanPrefix = cleanPrefix.substring(0, 4);
        }

        StringBuilder sb = new StringBuilder();
        sb.append(cleanPrefix).append("-").append(Year.now().getValue()).append("-");
        for (int i = 0; i < 4; i++) {
            sb.append(ALPHANUMERIC[RANDOM.nextInt(ALPHANUMERIC.length)]);
        }
        sb.append("-");
        for (int i = 0; i < 4; i++) {
            sb.append(ALPHANUMERIC[RANDOM.nextInt(ALPHANUMERIC.length)]);
        }
        return sb.toString();
    }
}
