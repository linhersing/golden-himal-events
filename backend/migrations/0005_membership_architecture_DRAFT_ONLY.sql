-- Golden Himal Voice | MEMBER ARCHITECTURE DRAFT ONLY.
-- DO NOT APPLY TO CLOUDFLARE D1 YET. Review the actual 0003/0004 draft migrations
-- and applicable Nepal privacy, tax, child age and record retention rules first.
-- This draft shows relational boundaries, not production-ready auth endpoints.
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS member_accounts (
  id TEXT PRIMARY KEY,
  email_hmac TEXT NOT NULL UNIQUE,
  email_encrypted BLOB NOT NULL,
  email_verified_at INTEGER,
  status TEXT NOT NULL DEFAULT 'pending_verification'
    CHECK(status IN ('pending_verification','active','suspended','erasure_pending')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS member_profiles (
  member_id TEXT PRIMARY KEY REFERENCES member_accounts(id),
  full_name_encrypted BLOB NOT NULL,
  birth_date_encrypted BLOB NOT NULL,
  university_proof_storage_ref TEXT,
  declared_group TEXT NOT NULL CHECK(declared_group IN ('university','community')),
  annual_group_year INTEGER NOT NULL DEFAULT 2027,
  consent_version TEXT NOT NULL,
  consent_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS member_email_challenges (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES member_accounts(id),
  token_hmac TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 8),
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_member_email_pending ON member_email_challenges(member_id,expires_at);
CREATE TABLE IF NOT EXISTS member_sessions (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES member_accounts(id),
  session_hmac TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_member_sessions_expiry ON member_sessions(expires_at);
CREATE TABLE IF NOT EXISTS member_qualifier_applications (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES member_accounts(id),
  season_round_id TEXT NOT NULL,
  declared_group TEXT NOT NULL CHECK(declared_group IN ('university','community')),
  demo_storage_ref TEXT NOT NULL,
  draft_version TEXT NOT NULL DEFAULT '2027-DRAFT1',
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK(status IN ('submitted','needs_info','screening','shortlisted','rejected','finalist')),
  submitted_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(member_id,season_round_id)
);
CREATE INDEX IF NOT EXISTS idx_member_apps_round_status ON member_qualifier_applications(season_round_id,status);
CREATE TABLE IF NOT EXISTS reviewer_assignments (
  application_id TEXT NOT NULL REFERENCES member_qualifier_applications(id),
  reviewer_member_id TEXT NOT NULL,
  conflict_declared INTEGER NOT NULL DEFAULT 0 CHECK(conflict_declared IN (0,1)),
  PRIMARY KEY(application_id,reviewer_member_id)
);
CREATE TABLE IF NOT EXISTS reviewer_scores (
  application_id TEXT NOT NULL,
  reviewer_member_id TEXT NOT NULL,
  technique_score INTEGER NOT NULL CHECK(technique_score BETWEEN 0 AND 60),
  interpretation_score INTEGER NOT NULL CHECK(interpretation_score BETWEEN 0 AND 40),
  sealed_at INTEGER,
  submitted_at INTEGER NOT NULL,
  PRIMARY KEY(application_id,reviewer_member_id),
  FOREIGN KEY(application_id,reviewer_member_id)
   REFERENCES reviewer_assignments(application_id,reviewer_member_id)
);
CREATE TABLE IF NOT EXISTS operator_roles (
  operator_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('registrar','finance','reviewer','chief_judge','publisher','auditor')),
  granted_at INTEGER NOT NULL,
  revoked_at INTEGER,
  PRIMARY KEY(operator_id,role)
);
CREATE TABLE IF NOT EXISTS member_audit_events (
  id TEXT PRIMARY KEY,
  actor_type TEXT NOT NULL CHECK(actor_type IN ('member','operator','system','payment_provider')),
  actor_id TEXT,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  event TEXT NOT NULL,
  event_at INTEGER NOT NULL,
  safe_details_json TEXT CHECK(length(safe_details_json)<=2000)
);
-- Production requirements missing here on purpose:
--   Account email verification via paid/reliable provider + OTP rate limiting.
--   Session cookies must be HttpOnly/Secure/SameSite; CSRF protection,
--   rotating sessions, device revocation, no hardcoded passwords or localStorage tokens.
--   HMAC email hashing uses server secret; encrypted PII uses server-managed keys.
--   R2 demo files must be private, upload signed/size/type checked, scan/retention.
--   Member age >=18 at registration deadline verified server-side with sensitive data.
--   Annual category lock/finalist lock/payment confirmation implemented
--   atomically in authorized server code (not relying only on UI or SQL).
--   Review conflicts, roles, immutable score sealing, operator access and audit.
--   Payment orders schema is in 0004_payment_architecture_DRAFT_ONLY.sql.
--   Plan migrations/rollbacks, data retention, D1 backup/restore before deployment.
