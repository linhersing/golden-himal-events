-- TEST-only additive username/password identity. Do not apply to production.
CREATE TABLE IF NOT EXISTS e2e_password_accounts (
 account_id TEXT PRIMARY KEY REFERENCES e2e_accounts(id) ON DELETE CASCADE,
 username_fingerprint TEXT NOT NULL UNIQUE,
 password_salt TEXT NOT NULL,
 password_hash TEXT NOT NULL,
 recovery_fingerprint TEXT NOT NULL,
 failed_count INTEGER NOT NULL DEFAULT 0,
 locked_until INTEGER NOT NULL DEFAULT 0,
 created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS e2e_password_attempts (
 id TEXT PRIMARY KEY,
 source_fingerprint TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('register','login','recover')),
 created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS e2e_pw_attempts_kind_source ON e2e_password_attempts(kind,source_fingerprint,created_at);
CREATE INDEX IF NOT EXISTS e2e_pw_attempts_created ON e2e_password_attempts(created_at);
