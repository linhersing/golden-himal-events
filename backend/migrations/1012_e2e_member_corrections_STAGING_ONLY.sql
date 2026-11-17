-- 2026-11-17 · Golden Himal TEST only · additive, owner-scoped correction requests
-- Apply ONLY to an isolated E2E D1 after backup. Does not unlock judged records.
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS e2e_member_correction_requests (
 id TEXT PRIMARY KEY,
 application_id TEXT NOT NULL REFERENCES e2e_applications(id) ON DELETE CASCADE,
 account_id TEXT NOT NULL REFERENCES e2e_accounts(id) ON DELETE CASCADE,
 previous_stage_name TEXT NOT NULL,
 previous_affiliation TEXT NOT NULL,
 proposed_stage_name TEXT NOT NULL,
 proposed_affiliation TEXT NOT NULL,
 reason TEXT NOT NULL,
 state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','accepted','declined')),
 created_at INTEGER NOT NULL,
 reviewed_at INTEGER,
 reviewed_by TEXT REFERENCES e2e_accounts(id) ON DELETE SET NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS e2e_member_correction_one_pending
 ON e2e_member_correction_requests(application_id) WHERE state='pending';
CREATE INDEX IF NOT EXISTS e2e_member_correction_member_history
 ON e2e_member_correction_requests(account_id,created_at DESC);
CREATE INDEX IF NOT EXISTS e2e_member_correction_admin_queue
 ON e2e_member_correction_requests(state,created_at DESC);
CREATE TABLE IF NOT EXISTS e2e_member_correction_audit (
 id TEXT PRIMARY KEY,
 correction_id TEXT NOT NULL REFERENCES e2e_member_correction_requests(id) ON DELETE CASCADE,
 actor_account_id TEXT NOT NULL REFERENCES e2e_accounts(id) ON DELETE CASCADE,
 action TEXT NOT NULL CHECK(action IN ('requested','accepted','declined')),
 occurred_at INTEGER NOT NULL,
 UNIQUE(correction_id,action)
);
-- No modification to judged song/performance/score data is authorized by this migration.
