package com.certflow.common.util;

import com.certflow.common.dto.CsvDtos;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.regex.Pattern;

public final class CsvStreamingParser {

    private static final Pattern EMAIL_PATTERN = Pattern.compile(
            "^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,63}$"
    );

    private static final String COL_PARTICIPANT_NAME = "participant_name";
    private static final String COL_EMAIL = "email";
    private static final String COL_CERTIFICATE_TYPE = "certificate_type";

    private CsvStreamingParser() {}

    /**
     * Parses an input stream of CSV data, validating headers, rows, emails, and duplicate entries.
     * Streams rows without buffering the entire dataset.
     */
    public static CsvDtos.CsvValidationResultDto parseAndValidate(InputStream inputStream, int maxPreviewRows) throws IOException {
        String importId = UUID.randomUUID().toString();
        List<CsvDtos.CsvRowDto> previewRows = new ArrayList<>();
        List<CsvDtos.CsvRowError> errors = new ArrayList<>();
        Set<String> seenEmails = new HashSet<>();

        int totalRows = 0;
        int validRows = 0;
        int invalidRows = 0;
        int duplicateCount = 0;

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream, StandardCharsets.UTF_8));
             CSVParser csvParser = CSVFormat.DEFAULT
                     .builder()
                     .setHeader()
                     .setSkipHeaderRecord(true)
                     .setIgnoreHeaderCase(true)
                     .setTrim(true)
                     .build()
                     .parse(reader)) {

            Map<String, Integer> headerMap = csvParser.getHeaderMap();
            String nameHeader = null;
            String emailHeader = null;
            String certTypeHeader = null;

            if (headerMap != null) {
                for (String h : headerMap.keySet()) {
                    String clean = h.trim().toLowerCase(Locale.ROOT).replace(" ", "_").replace("-", "");
                    if (nameHeader == null && (clean.equals("participant_name") || clean.equals("name") || clean.equals("fullname") || clean.equals("full_name") || clean.equals("student_name") || clean.equals("attendee") || clean.equals("recipient_name") || clean.equals("recipient"))) {
                        nameHeader = h;
                    } else if (emailHeader == null && (clean.equals("email") || clean.equals("email_address") || clean.equals("emailaddress") || clean.equals("mail") || clean.equals("recipient_email"))) {
                        emailHeader = h;
                    } else if (certTypeHeader == null && (clean.equals("certificate_type") || clean.equals("type") || clean.equals("role") || clean.equals("category") || clean.equals("award") || clean.equals("cert_type"))) {
                        certTypeHeader = h;
                    }
                }
            }

            if (nameHeader == null || emailHeader == null) {
                CsvDtos.CsvRowError headerError = new CsvDtos.CsvRowError(
                        0,
                        "header",
                        headerMap != null ? headerMap.keySet().toString() : "empty",
                        "CSV must contain at least name (e.g. 'name' or 'participant_name') and email (e.g. 'email') columns"
                );
                errors.add(headerError);
                return CsvDtos.CsvValidationResultDto.builder()
                        .importId(importId)
                        .totalRows(0)
                        .validRows(0)
                        .invalidRows(1)
                        .duplicateEmailCount(0)
                        .previewRows(Collections.emptyList())
                        .errors(errors)
                        .build();
            }

            for (CSVRecord record : csvParser) {
                totalRows++;
                int rowIndex = (int) record.getRecordNumber();

                String name = record.get(nameHeader);
                String email = record.get(emailHeader);
                String certType = certTypeHeader != null ? record.get(certTypeHeader) : "Participant";

                List<String> rowErrors = new ArrayList<>();

                if (name == null || name.trim().isEmpty()) {
                    rowErrors.add("Participant name is missing");
                    errors.add(new CsvDtos.CsvRowError(rowIndex, "participant_name", name, "Participant name is required"));
                }

                if (email == null || email.trim().isEmpty()) {
                    rowErrors.add("Email is missing");
                    errors.add(new CsvDtos.CsvRowError(rowIndex, "email", email, "Email is required"));
                } else {
                    String cleanEmail = email.trim().toLowerCase(Locale.ROOT);
                    if (!EMAIL_PATTERN.matcher(cleanEmail).matches()) {
                        rowErrors.add("Invalid email format");
                        errors.add(new CsvDtos.CsvRowError(rowIndex, "email", email, "Invalid email address"));
                    } else if (seenEmails.contains(cleanEmail)) {
                        duplicateCount++;
                        rowErrors.add("Duplicate email in batch");
                        errors.add(new CsvDtos.CsvRowError(rowIndex, "email", email, "Duplicate email in batch: " + email));
                    } else {
                        seenEmails.add(cleanEmail);
                    }
                }

                boolean isValid = rowErrors.isEmpty();
                if (isValid) {
                    validRows++;
                } else {
                    invalidRows++;
                }

                if (previewRows.size() < maxPreviewRows) {
                    previewRows.add(CsvDtos.CsvRowDto.builder()
                            .rowIndex(rowIndex)
                            .participantName(name)
                            .email(email)
                            .certificateType(certType != null && !certType.isBlank() ? certType : "Participant")
                            .valid(isValid)
                            .errorMessage(isValid ? null : String.join("; ", rowErrors))
                            .build());
                }
            }
        }

        return CsvDtos.CsvValidationResultDto.builder()
                .importId(importId)
                .totalRows(totalRows)
                .validRows(validRows)
                .invalidRows(invalidRows)
                .duplicateEmailCount(duplicateCount)
                .previewRows(previewRows)
                .errors(errors)
                .build();
    }
}
