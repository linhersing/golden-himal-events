-- Golden Himal Voice: proposed STRICT eligibility model for independently issued credentials.
-- DRAFT ONLY. This is an alternative to the email-only vote flow in 0001_core.sql.
-- The eligibility_hash is a keyed HMAC of an identity verified outside this database.
-- DO NOT store raw ID documents, emails or national ID numbers in this ledger.
CREATE TABLE IF NOT EXISTS voter_eligibilities (
  id TEXT PRIMARY KEY,
  round_id TEXT NOT NULL REFERENCES rounds(id),
  eligibility_hash TEXT NOT NULL,
  credential_hash TEXT NOT NULL UNIQUE,
  issued_at INTEGER NOT NULL,
  issued_by TEXT NOT NULL,
  eligibility_method TEXT NOT NULL CHECK (eligibility_method IN ('on_site_checked','remote_reviewed')),
  state TEXT NOT NULL DEFAULT 'issued' CHECK (state IN ('issued','revoked')),
  revoked_at INTEGER,
  UNIQUE(round_id, eligibility_hash)
);

CREATE INDEX IF NOT EXISTS idx_eligibility_round_state
  ON voter_eligibilities(round_id, state);

CREATE TABLE IF NOT EXISTS credential_votes (
  id TEXT PRIMARY KEY,
  round_id TEXT NOT NULL REFERENCES rounds(id),
  contestant_id TEXT NOT NULL REFERENCES contestants(id),
  eligibility_id TEXT NOT NULL REFERENCES voter_eligibilities(id),
  cast_at INTEGER NOT NULL,
  UNIQUE(round_id, eligibility_id)
);

CREATE INDEX IF NOT EXISTS idx_credential_votes_round_contestant
  ON credential_votes(round_id, contestant_id);

-- Stronger ledger integrity: eligibility and candidate must match voting round,
-- and credential must not have been revoked. Admin issuance remains offline / role-gated.
CREATE TRIGGER IF NOT EXISTS credential_vote_guard
BEFORE INSERT ON credential_votes
FOR EACH ROW
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM voter_eligibilities e JOIN rounds r ON r.id=e.round_id
    JOIN contestants c ON c.id=NEW.contestant_id
    WHERE e.id=NEW.eligibility_id
      AND e.round_id=NEW.round_id
      AND e.state='issued'
      AND r.state='open'
      AND c.round_id=NEW.round_id
      AND c.approved=1
      AND r.opens_at<=NEW.cast_at AND NEW.cast_at<r.closes_at
  ) THEN RAISE(ABORT,'credential_not_eligible') END;
END;
