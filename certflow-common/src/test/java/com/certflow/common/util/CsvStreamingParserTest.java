package com.certflow.common.util;

import com.certflow.common.dto.CsvDtos;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.*;

class CsvStreamingParserTest {

    @Test
    @DisplayName("Should successfully parse valid participant CSV")
    void testValidCsv() throws IOException {
        String csv = """
            participant_name,email,certificate_type
            Arun Kumar,arun@example.com,Winner
            Priya Sharma,priya@example.com,Participant
            Rahul Verma,rahul@example.com,Finalist
            """;

        ByteArrayInputStream in = new ByteArrayInputStream(csv.getBytes(StandardCharsets.UTF_8));
        CsvDtos.CsvValidationResultDto result = CsvStreamingParser.parseAndValidate(in, 10);

        assertEquals(3, result.getTotalRows());
        assertEquals(3, result.getValidRows());
        assertEquals(0, result.getInvalidRows());
        assertEquals(0, result.getDuplicateEmailCount());
        assertEquals(3, result.getPreviewRows().size());
        assertTrue(result.getErrors().isEmpty());
    }

    @Test
    @DisplayName("Should detect invalid emails, missing names, and duplicate emails")
    void testInvalidAndDuplicateCsv() throws IOException {
        String csv = """
            participant_name,email,certificate_type
            Valid User,valid@example.com,Winner
            ,missingname@example.com,Participant
            Bad Email User,not-an-email,Finalist
            Duplicate User,valid@example.com,Participant
            """;

        ByteArrayInputStream in = new ByteArrayInputStream(csv.getBytes(StandardCharsets.UTF_8));
        CsvDtos.CsvValidationResultDto result = CsvStreamingParser.parseAndValidate(in, 10);

        assertEquals(4, result.getTotalRows());
        assertEquals(1, result.getValidRows());
        assertEquals(3, result.getInvalidRows());
        assertEquals(1, result.getDuplicateEmailCount());
        assertFalse(result.getErrors().isEmpty());
    }

    @Test
    @DisplayName("Should reject CSV with missing required headers")
    void testMissingHeaders() throws IOException {
        String csv = """
            first_name,last_name,phone
            John,Doe,1234567890
            """;

        ByteArrayInputStream in = new ByteArrayInputStream(csv.getBytes(StandardCharsets.UTF_8));
        CsvDtos.CsvValidationResultDto result = CsvStreamingParser.parseAndValidate(in, 10);

        assertEquals(0, result.getValidRows());
        assertEquals(1, result.getInvalidRows());
        assertEquals("header", result.getErrors().get(0).getField());
    }
}
