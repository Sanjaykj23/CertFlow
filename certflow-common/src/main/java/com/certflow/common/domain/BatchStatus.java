package com.certflow.common.domain;

public enum BatchStatus {
    DRAFT,
    VALIDATED,
    QUEUED,
    PROCESSING,
    COMPLETED,
    PARTIALLY_FAILED,
    FAILED,
    CANCELLED
}
