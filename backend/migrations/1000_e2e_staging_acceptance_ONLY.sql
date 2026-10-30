-- Real D1 persistence for an isolated TEST-ONLY acceptance environment.
-- MANUAL APPLY to ghv-staging ONLY, never to a production database.
-- Every email must be a purpose-created test identity; no data from localStorage.
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS e2e_accounts (
 id TEXT PRIMARY KEY,
 email_fingerprint TEXT NOT NULL UNIQUE,
 email_hint TEXT NOT NULL,
 role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('member','reviewer')),
 verified_at INTEGER,
 created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS e2e_email_challenges (
 id TEXT PRIMARY KEY,
 email_fingerprint TEXT NOT NULL,
 code_fingerprint TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('member','reviewer')),
 expires_at INTEGER NOT NULL,
 used_at INTEGER,
 attempts INTEGER NOT NULL DEFAULT 0,
 created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS e2e_challenges_lookup ON e2e_email_challenges(email_fingerprint,created_at);
CREATE TABLE IF NOT EXISTS e2e_sessions (
 session_fingerprint TEXT PRIMARY KEY,
 account_id TEXT NOT NULL REFERENCES e2e_accounts(id) ON DELETE CASCADE,
 expires_at INTEGER NOT NULL,
 created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS e2e_session_expiry ON e2e_sessions(expires_at);
CREATE TABLE IF NOT EXISTS e2e_applications (
 id TEXT PRIMARY KEY,
 account_id TEXT NOT NULL REFERENCES e2e_accounts(id) ON DELETE CASCADE,
 round_code TEXT NOT NULL CHECK(round_code IN ('2027-03','2027-06','2027-09')),
 category TEXT NOT NULL CHECK(category IN ('university','community')),
 stage_name TEXT NOT NULL,
 demo_url TEXT,
 media_key TEXT,
 status TEXT NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted','needs_info','under_review','scored','shortlisted','rejected','withdrawn')),
 payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK(payment_status IN ('unpaid','simulated_paid')),
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL,
 UNIQUE(account_id,round_code)
);
-- Database-enforced annual category lock. A separate SELECT in the Worker
-- is not concurrency-safe when two rounds submit at the same time.
CREATE TRIGGER IF NOT EXISTS e2e_annual_category_lock
BEFORE INSERT ON e2e_applications
FOR EACH ROW
BEGIN
 SELECT CASE WHEN EXISTS(
  SELECT 1 FROM e2e_applications
   WHERE account_id=NEW.account_id AND category<>NEW.category
 ) THEN RAISE(ABORT,'annual_category_locked') END;
END;
CREATE INDEX IF NOT EXISTS e2e_apps_review ON e2e_applications(status,payment_status);
CREATE TABLE IF NOT EXISTS e2e_payment_events (
 id TEXT PRIMARY KEY,
 application_id TEXT NOT NULL UNIQUE REFERENCES e2e_applications(id) ON DELETE CASCADE,
 event_type TEXT NOT NULL CHECK(event_type='SIMULATED_PAYMENT'),
 amount_paisa INTEGER NOT NULL DEFAULT 50000 CHECK(amount_paisa=50000),
 created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS e2e_judge_scores (
 application_id TEXT NOT NULL REFERENCES e2e_applications(id) ON DELETE CASCADE,
 reviewer_id TEXT NOT NULL REFERENCES e2e_accounts(id) ON DELETE CASCADE,
 technique INTEGER NOT NULL CHECK(technique BETWEEN 0 AND 60),
 interpretation INTEGER NOT NULL CHECK(interpretation BETWEEN 0 AND 40),
 conflict_checked INTEGER NOT NULL DEFAULT 0 CHECK(conflict_checked=1),
 created_at INTEGER NOT NULL,
 PRIMARY KEY(application_id,reviewer_id)
);
-- No personal addresses, raw verification codes, passwords or payment credentials
-- are stored. Email fingerprint must use HMAC with a Cloudflare secret.
-- This is a true persistence STAGING schema, but DOES NOT imply live payment.
