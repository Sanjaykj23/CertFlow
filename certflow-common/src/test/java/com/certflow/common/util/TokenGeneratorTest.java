package com.certflow.common.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class TokenGeneratorTest {

    @Test
    @DisplayName("Should generate unique, high-entropy 256-bit verification tokens")
    void testVerificationTokens() {
        Set<String> tokens = new HashSet<>();
        for (int i = 0; i < 1000; i++) {
            String token = TokenGenerator.generateVerificationToken();
            assertNotNull(token);
            assertTrue(token.length() >= 40, "Verification token should be sufficiently long and unguessable");
            assertFalse(token.contains("="), "Token should be URL-safe without padding");
            assertFalse(token.contains("+"), "Token should not contain unsafe + characters");
            assertFalse(token.contains("/"), "Token should not contain unsafe / characters");
            tokens.add(token);
        }
        assertEquals(1000, tokens.size(), "All 1000 generated tokens must be distinct");
    }

    @Test
    @DisplayName("Should generate formatted unique Certificate Numbers")
    void testCertificateNumbers() {
        Set<String> certNumbers = new HashSet<>();
        for (int i = 0; i < 500; i++) {
            String num = TokenGenerator.generateCertificateNumber("HACK");
            assertNotNull(num);
            assertTrue(num.startsWith("HACK-"), "Should use clean uppercase prefix");
            certNumbers.add(num);
        }
        assertEquals(500, certNumbers.size(), "All certificate numbers must be unique");
    }
}
