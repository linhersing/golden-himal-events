-- Golden Himal Voice E2E TEST database only. Apply after confirming backup and restore point.
CREATE TABLE IF NOT EXISTS e2e_staff_auth_attempts (
  id INTEGER PRIMARY KEY,
  kind TEXT NOT NULL CHECK(kind IN ('request','verify')),
  source_fingerprint TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS e2e_staff_auth_source_time ON e2e_staff_auth_attempts(kind,source_fingerprint,created_at);
CREATE INDEX IF NOT EXISTS e2e_staff_auth_expiry ON e2e_staff_auth_attempts(created_at);
