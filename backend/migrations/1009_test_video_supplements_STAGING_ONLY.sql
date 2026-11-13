-- Isolated E2E database only. No existing applications or approvals are rewritten.
CREATE TABLE IF NOT EXISTS e2e_test_video_supplements (
 application_id TEXT PRIMARY KEY REFERENCES e2e_applications(id) ON DELETE CASCADE,
 requested_by TEXT NOT NULL REFERENCES e2e_accounts(id),
 requested_at INTEGER NOT NULL,
 submitted_at INTEGER CHECK(submitted_at IS NULL OR (submitted_at>=requested_at AND submitted_at<requested_at+172800))
);
