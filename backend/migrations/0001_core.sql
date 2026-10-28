-- Golden Himal Voice: initial vote model. No production voters are present.
-- Sensitive raw email and IP addresses are intentionally not stored.
CREATE TABLE IF NOT EXISTS rounds (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  opens_at INTEGER NOT NULL,
  closes_at INTEGER NOT NULL,
  state TEXT NOT NULL DEFAULT 'draft' CHECK (state IN ('draft','open','paused','closed')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE TABLE IF NOT EXISTS contestants (
  id TEXT PRIMARY KEY,
  round_id TEXT NOT NULL REFERENCES rounds(id),
  public_name TEXT NOT NULL,
  approved INTEGER NOT NULL DEFAULT 0 CHECK (approved IN (0,1))
);
CREATE TABLE IF NOT EXISTS challenges (
  id TEXT PRIMARY KEY,
  round_id TEXT NOT NULL REFERENCES rounds(id),
  voter_hash TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  contestant_id TEXT NOT NULL REFERENCES contestants(id),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  consumed_at INTEGER,
  CHECK (expires_at > created_at)
);
CREATE INDEX IF NOT EXISTS idx_challenges_voter ON challenges(round_id,voter_hash,created_at);
CREATE TABLE IF NOT EXISTS votes (
  id TEXT PRIMARY KEY,
  round_id TEXT NOT NULL REFERENCES rounds(id),
  contestant_id TEXT NOT NULL REFERENCES contestants(id),
  voter_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  challenge_id TEXT NOT NULL UNIQUE REFERENCES challenges(id),
  UNIQUE(round_id,voter_hash)
);
CREATE INDEX IF NOT EXISTS idx_votes_contestant ON votes(round_id,contestant_id);
-- For privacy, keep audit logs event-based rather than saving names/emails or raw IP.
CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  event TEXT NOT NULL,
  round_id TEXT,
  ref_id TEXT,
  detail TEXT
);
