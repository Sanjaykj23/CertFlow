-- OTP store used by AuthService (registration + password reset).
-- Portable across PostgreSQL and H2 (MODE=PostgreSQL).

CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    otp_code VARCHAR(16) NOT NULL,
    token_type VARCHAR(50) NOT NULL,
    full_name VARCHAR(255),
    password_hash VARCHAR(255),
    organization_name VARCHAR(255),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_tokens_lookup ON email_verification_tokens(email, token_type, verified, created_at);
