-- CertFlow Initial Schema Migration
-- Compatible with CockroachDB and PostgreSQL

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_org_user UNIQUE (organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS certificate_templates (
    id UUID PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    background_storage_key VARCHAR(500),
    orientation VARCHAR(20) NOT NULL DEFAULT 'LANDSCAPE',
    width INT NOT NULL DEFAULT 842,
    height INT NOT NULL DEFAULT 595,
    layout_json TEXT NOT NULL,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS certificate_batches (
    id UUID PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES certificate_templates(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    total_count INT NOT NULL DEFAULT 0,
    generated_count INT NOT NULL DEFAULT 0,
    email_sent_count INT NOT NULL DEFAULT 0,
    failed_count INT NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS batch_participants (
    id UUID PRIMARY KEY,
    batch_id UUID NOT NULL REFERENCES certificate_batches(id) ON DELETE CASCADE,
    row_index INT NOT NULL,
    participant_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    certificate_type VARCHAR(100) NOT NULL DEFAULT 'Participant',
    custom_attributes_json TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_batch_email UNIQUE (batch_id, email)
);

CREATE TABLE IF NOT EXISTS certificate_jobs (
    id UUID PRIMARY KEY,
    batch_id UUID NOT NULL REFERENCES certificate_batches(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES batch_participants(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    attempt_count INT NOT NULL DEFAULT 0,
    error_message TEXT,
    error_category VARCHAR(50),
    next_retry_at TIMESTAMP WITH TIME ZONE,
    locked_by VARCHAR(255),
    locked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS certificates (
    id UUID PRIMARY KEY,
    job_id UUID REFERENCES certificate_jobs(id) ON DELETE SET NULL,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES certificate_templates(id) ON DELETE RESTRICT,
    template_version INT NOT NULL DEFAULT 1,
    certificate_number VARCHAR(100) NOT NULL UNIQUE,
    verification_token VARCHAR(255) NOT NULL UNIQUE,
    participant_name VARCHAR(255) NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    certificate_type VARCHAR(100) NOT NULL,
    pdf_storage_key VARCHAR(500),
    status VARCHAR(50) NOT NULL DEFAULT 'VALID',
    email_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    replacement_for_id UUID REFERENCES certificates(id) ON DELETE SET NULL,
    replaced_by_id UUID REFERENCES certificates(id) ON DELETE SET NULL,
    revocation_reason TEXT,
    issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_delivery_attempts (
    id UUID PRIMARY KEY,
    certificate_id UUID NOT NULL REFERENCES certificates(id) ON DELETE CASCADE,
    attempt_number INT NOT NULL,
    status VARCHAR(50) NOT NULL,
    error_message TEXT,
    error_category VARCHAR(50),
    attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS outbox_events (
    id UUID PRIMARY KEY,
    aggregate_type VARCHAR(100) NOT NULL,
    aggregate_id UUID NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload_json TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    attempt_count INT NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID,
    details_json TEXT,
    ip_address VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Core Performance & Query Indexes
CREATE INDEX IF NOT EXISTS idx_events_org ON events(organization_id, event_date DESC);
CREATE INDEX IF NOT EXISTS idx_templates_event ON certificate_templates(event_id);
CREATE INDEX IF NOT EXISTS idx_batches_event ON certificate_batches(event_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_batch_status ON certificate_jobs(batch_id, status);
CREATE INDEX IF NOT EXISTS idx_jobs_retry ON certificate_jobs(status, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_cert_event ON certificates(event_id);
CREATE INDEX IF NOT EXISTS idx_cert_token ON certificates(verification_token);
CREATE INDEX IF NOT EXISTS idx_cert_number ON certificates(certificate_number);
CREATE INDEX IF NOT EXISTS idx_email_attempts_cert ON email_delivery_attempts(certificate_id, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_outbox_pending ON outbox_events(status, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_audit_org ON audit_logs(organization_id, created_at DESC);
