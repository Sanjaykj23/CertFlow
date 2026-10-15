package com.certflow.common.domain;

public enum UserRole {
    OWNER,
    ADMIN,
    OPERATOR,
    VIEWER;

    public boolean canManageOrganization() {
        return this == OWNER;
    }

    public boolean canManageTemplatesAndEvents() {
        return this == OWNER || this == ADMIN;
    }

    public boolean canExecuteBatches() {
        return this == OWNER || this == ADMIN || this == OPERATOR;
    }
}
