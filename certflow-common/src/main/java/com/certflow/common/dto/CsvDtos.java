package com.certflow.common.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

public class CsvDtos {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CsvRowDto {
        private int rowIndex;
        private String participantName;
        private String email;
        private String certificateType;
        private boolean valid;
        private String errorMessage;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CsvValidationResultDto {
        private String importId;
        private int totalRows;
        private int validRows;
        private int invalidRows;
        private int duplicateEmailCount;
        @Builder.Default
        private List<CsvRowDto> previewRows = new ArrayList<>();
        @Builder.Default
        private List<CsvRowError> errors = new ArrayList<>();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CsvRowError {
        private int rowIndex;
        private String field;
        private String rawValue;
        private String message;
    }
}
