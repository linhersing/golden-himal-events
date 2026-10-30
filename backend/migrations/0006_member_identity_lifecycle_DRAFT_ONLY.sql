-- Golden Himal Voice | production member identity integration contract, DRAFT ONLY.
-- DO NOT APPLY TO CLOUDFLARE D1. This requires a selected, contracted OIDC identity
-- provider (IdP), encrypted profile data policy and explicit production approval.
-- Depends on 0005_membership_architecture_DRAFT_ONLY.sql (also NOT deployed).
-- Passwords, password hashes, password-reset tokens and MFA secrets live with the IdP,
-- never in this D1 database or localStorage.
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS member_identity_links (
  member_id TEXT NOT NULL REFERENCES member_accounts(id),
  provider TEXT NOT NULL CHECK(provider IN ('approved-oidc-provider')),
  subject_id TEXT NOT NULL,
  linked_at INTEGER NOT NULL,
  revoked_at INTEGER,
  PRIMARY KEY(provider,subject_id),
  UNIQUE(member_id,provider)
);
CREATE INDEX IF NOT EXISTS idx_member_identity_member
  ON member_identity_links(member_id);

CREATE TABLE IF NOT EXISTS member_account_requests (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES member_accounts(id),
  action TEXT NOT NULL CHECK(action IN ('data_export','account_erasure')),
  state TEXT NOT NULL DEFAULT 'requested'
    CHECK(state IN ('requested','identity_reconfirmed','in_review','completed','denied_lawful_retention')),
  requested_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  completed_at INTEGER,
  CHECK(updated_at>=requested_at)
);
CREATE INDEX IF NOT EXISTS idx_member_requests_member
  ON member_account_requests(member_id,state);

-- Security/operational invariants (NOT implemented by SQL alone):
-- - Verify external IdP OIDC issuer, audience, signature, expiry, nonce/state and
--   subject before mapping an authenticated user to a member_id.
-- - Do NOT grant membership by matching an unverified email from browser data.
-- - Use HttpOnly, Secure, SameSite cookies for the app session, CSRF protections;
--   do NOT put bearer tokens, password hashes or secrets into browser localStorage.
-- - Email must be verified before activating an account, even if it is the login ID.
-- - IdP handles secure password generation/setting, password updates, forgot-password
--   single-use time-limited reset links, password breach checks, rate limits, MFA.
-- - Never generate or email a reusable password in cleartext.
-- - A member may hold multiple round registrations but only the member can read them.
-- - Keep staging test identities and production identities strictly separate.
-- - Soft-delete and verified erasure must respect legal finance/contest retention.
-- - Require approved schema reconciliation with 0003 and 0005 before applying.
