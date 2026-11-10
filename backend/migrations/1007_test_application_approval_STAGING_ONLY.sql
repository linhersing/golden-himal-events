-- Additive TEST-only organizer approval. Existing applications remain pending.
CREATE TABLE IF NOT EXISTS e2e_test_application_approvals (
 application_id TEXT PRIMARY KEY NOT NULL REFERENCES e2e_applications(id) ON DELETE CASCADE,
 approved_by TEXT NOT NULL REFERENCES e2e_accounts(id),
 approved_at INTEGER NOT NULL
);
