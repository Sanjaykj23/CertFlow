package com.certflow.api.service;

import com.certflow.common.dto.CsvDtos;
import com.certflow.common.util.CsvStreamingParser;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;

@Service
public class CsvImportService {

    public CsvDtos.CsvValidationResultDto validateCsv(InputStream inputStream) throws IOException {
        return CsvStreamingParser.parseAndValidate(inputStream, 50000);
    }
}
