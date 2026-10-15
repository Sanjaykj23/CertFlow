package com.certflow.common.domain;

public enum EmailStatus {
    PENDING,
    QUEUED,
    SENDING,
    SENT,
    RETRY_WAIT,
    FAILED,
    CANCELLED
}
