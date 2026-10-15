package com.certflow.common.domain;

public enum JobStatus {
    PENDING,
    QUEUED,
    PROCESSING,
    GENERATED,
    FAILED,
    CANCELLED;

    public boolean isTerminal() {
        return this == GENERATED || this == FAILED || this == CANCELLED;
    }
}
