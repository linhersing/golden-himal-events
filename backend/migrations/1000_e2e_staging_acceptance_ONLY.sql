-- Golden Himal Voice 2027 • Alan V2 dated 2026-10-29 • TEST STAGING ONLY
-- IMPORTANT: As of 2026-10-30 this has NOT been applied to ghv-staging.
-- Apply to a fresh isolated staging D1 only after backup and owner authorization.
-- Do not run over existing e2e_* tables; there is no destructive migration here.
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS e2e_accounts (
 id TEXT PRIMARY KEY,
 email_fingerprint TEXT NOT NULL UNIQUE,
 email_hint TEXT NOT NULL,
 role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('member','reviewer','organizer')),
 verified_at INTEGER,
 created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS e2e_email_challenges (
 id TEXT PRIMARY KEY,
 email_fingerprint TEXT NOT NULL,
 code_fingerprint TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('member','reviewer','organizer')),
 expires_at INTEGER NOT NULL,
 used_at INTEGER,
 attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 5),
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

-- ONLY TWO ONLINE APPLICATION WINDOWS: Jan and Apr 2027.
-- The live qualifying contests are in Mar/Jun; the final is early Sep.
-- Self-declared test details, never a real applicant's personal identity.
CREATE TABLE IF NOT EXISTS e2e_applications (
 id TEXT PRIMARY KEY,
 account_id TEXT NOT NULL REFERENCES e2e_accounts(id) ON DELETE CASCADE,
 round_code TEXT NOT NULL CHECK(round_code IN ('2027-01','2027-04')),
 category TEXT NOT NULL CHECK(category IN ('university','community')),
 province TEXT NOT NULL CHECK(province IN ('bagmati','gandaki')),
 location_basis TEXT NOT NULL CHECK(location_basis IN ('residence','study','work')),
 affiliation TEXT NOT NULL,
 stage_name TEXT NOT NULL,
 song_title TEXT NOT NULL,
 original_artist TEXT NOT NULL,
 song_language TEXT NOT NULL,
 song_key TEXT NOT NULL,
 demo_url TEXT,
 media_key TEXT,
 eligibility_key TEXT,
 receipt_key TEXT,
 phase TEXT NOT NULL DEFAULT 'demo' CHECK(phase IN ('demo','qualifier','final')),
 status TEXT NOT NULL DEFAULT 'submitted'
  CHECK(status IN ('submitted','needs_info','under_review','scored','shortlisted','reserve','rejected','withdrawn')),
 payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK(payment_status IN ('unpaid','simulated_paid')),
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL,
 UNIQUE(account_id,round_code)
);
-- Account + year category never changes even if member applies again in April.
CREATE TRIGGER IF NOT EXISTS e2e_annual_category_lock
BEFORE INSERT ON e2e_applications FOR EACH ROW BEGIN
 SELECT CASE WHEN EXISTS(
  SELECT 1 FROM e2e_applications
   WHERE account_id=NEW.account_id AND category<>NEW.category
 ) THEN RAISE(ABORT,'annual_category_locked') END;
END;
-- A finalist cannot submit an April audition. Organizer promotions are stored server-side.
CREATE TRIGGER IF NOT EXISTS e2e_finalists_cannot_reapply
BEFORE INSERT ON e2e_applications FOR EACH ROW BEGIN
 SELECT CASE WHEN EXISTS(
  SELECT 1 FROM e2e_applications
   WHERE account_id=NEW.account_id AND phase='final'
 ) THEN RAISE(ABORT,'already_finalist') END;
END;
CREATE INDEX IF NOT EXISTS e2e_apps_review ON e2e_applications(round_code,category,phase,status,payment_status);

CREATE TABLE IF NOT EXISTS e2e_payment_events (
 id TEXT PRIMARY KEY,
 application_id TEXT NOT NULL UNIQUE REFERENCES e2e_applications(id) ON DELETE CASCADE,
 event_type TEXT NOT NULL CHECK(event_type='SIMULATED_PAYMENT'),
 amount_paisa INTEGER NOT NULL DEFAULT 50000 CHECK(amount_paisa=50000),
 created_at INTEGER NOT NULL
);
-- Demo: 60 technique + 40 expression, 3-5 reviewers, equal averaging.
CREATE TABLE IF NOT EXISTS e2e_judge_scores (
 application_id TEXT NOT NULL REFERENCES e2e_applications(id) ON DELETE CASCADE,
 reviewer_id TEXT NOT NULL REFERENCES e2e_accounts(id) ON DELETE CASCADE,
 technique INTEGER NOT NULL CHECK(technique BETWEEN 0 AND 60),
 interpretation INTEGER NOT NULL CHECK(interpretation BETWEEN 0 AND 40),
 conflict_checked INTEGER NOT NULL CHECK(conflict_checked=1),
 created_at INTEGER NOT NULL,
 PRIMARY KEY(application_id,reviewer_id)
);
-- Live qualifiers and final: 40 + 30 + 20 + 10, independent per phase.
CREATE TABLE IF NOT EXISTS e2e_live_scores (
 application_id TEXT NOT NULL REFERENCES e2e_applications(id) ON DELETE CASCADE,
 reviewer_id TEXT NOT NULL REFERENCES e2e_accounts(id) ON DELETE CASCADE,
 stage TEXT NOT NULL CHECK(stage IN ('qualifier','final')),
 technique INTEGER NOT NULL CHECK(technique BETWEEN 0 AND 40),
 interpretation INTEGER NOT NULL CHECK(interpretation BETWEEN 0 AND 30),
 stage_presence INTEGER NOT NULL CHECK(stage_presence BETWEEN 0 AND 20),
 appearance INTEGER NOT NULL CHECK(appearance BETWEEN 0 AND 10),
 conflict_checked INTEGER NOT NULL CHECK(conflict_checked=1),
 created_at INTEGER NOT NULL,
 PRIMARY KEY(application_id,reviewer_id,stage)
);
-- Staging votes: one per VERIFIED TEST MEMBER for the 2027 final rehearsal.
-- V2 has NOT yet defined actual voter verification or per-voter limit;
-- this stricter test-only rule cannot be used as the published official rule.
CREATE TABLE IF NOT EXISTS e2e_final_votes (
 voter_id TEXT NOT NULL REFERENCES e2e_accounts(id) ON DELETE CASCADE,
 application_id TEXT NOT NULL REFERENCES e2e_applications(id) ON DELETE CASCADE,
 created_at INTEGER NOT NULL,
 PRIMARY KEY(voter_id)
);
CREATE INDEX IF NOT EXISTS e2e_votes_application ON e2e_final_votes(application_id);

-- Atomic stage transitions and seat quotas, never set by browsers.
CREATE TRIGGER IF NOT EXISTS e2e_stage_quota
BEFORE UPDATE OF phase ON e2e_applications
FOR EACH ROW WHEN OLD.phase<>NEW.phase BEGIN
 SELECT CASE WHEN NOT (
  (OLD.phase='demo' AND NEW.phase='qualifier') OR
  (OLD.phase='qualifier' AND NEW.phase='final')
 ) THEN RAISE(ABORT,'invalid_stage_transition') END;
 SELECT CASE WHEN NEW.phase='qualifier' AND (
  SELECT COUNT(*) FROM e2e_applications WHERE round_code=NEW.round_code
  AND category=NEW.category AND phase IN ('qualifier','final')
  AND id<>NEW.id
 )>=25 THEN RAISE(ABORT,'qualifier_capacity_25') END;
 SELECT CASE WHEN NEW.phase='final' AND (
  SELECT COUNT(*) FROM e2e_applications WHERE round_code=NEW.round_code
  AND category=NEW.category AND phase='final' AND id<>NEW.id
 )>=8 THEN RAISE(ABORT,'final_capacity_8') END;
END;
-- Audit: role-gated manual advancement, no auto promotion by score alone.
CREATE TABLE IF NOT EXISTS e2e_promotion_events (
 id TEXT PRIMARY KEY,
 application_id TEXT NOT NULL REFERENCES e2e_applications(id) ON DELETE CASCADE,
 organizer_id TEXT NOT NULL REFERENCES e2e_accounts(id) ON DELETE CASCADE,
 from_phase TEXT NOT NULL,
 to_phase TEXT NOT NULL,
 created_at INTEGER NOT NULL
);
-- No production identity, actual payment, prize or redeemable voucher is issued.
