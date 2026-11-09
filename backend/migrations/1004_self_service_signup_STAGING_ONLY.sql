-- Additive migration for the isolated E2E test database only.
CREATE TABLE IF NOT EXISTS e2e_public_signup_attempts (
 challenge_id TEXT PRIMARY KEY,
 source_fingerprint TEXT NOT NULL,
 created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS e2e_public_signup_attempts_time ON e2e_public_signup_attempts(created_at);
CREATE INDEX IF NOT EXISTS e2e_public_signup_attempts_source_time ON e2e_public_signup_attempts(source_fingerprint,created_at);

CREATE TABLE IF NOT EXISTS e2e_public_signup_accounts (
 account_id TEXT PRIMARY KEY REFERENCES e2e_accounts(id) ON DELETE CASCADE,
 mailbox_fingerprint TEXT NOT NULL
);
