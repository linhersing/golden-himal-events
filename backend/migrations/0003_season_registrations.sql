-- Golden Himal Voice — registration architecture draft, not live or deployed.
-- This file intentionally includes NO real applicants, fees, identity documents or payment secrets.
-- Sensitive contact details and uploaded files require separately authorized encrypted storage.
CREATE TABLE IF NOT EXISTS season_rounds (
  id TEXT PRIMARY KEY,
  season_year INTEGER NOT NULL,
  round_key TEXT NOT NULL,
  round_type TEXT NOT NULL CHECK(round_type IN ('qualifier','final')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','approved','registration_open','closed','completed')),
  starts_at INTEGER,
  UNIQUE(season_year,round_key)
);
CREATE TABLE IF NOT EXISTS applicant_year_registry (
  season_year INTEGER NOT NULL,
  applicant_hash TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('university','community')),
  finalist_locked INTEGER NOT NULL DEFAULT 0 CHECK(finalist_locked IN (0,1)),
  PRIMARY KEY(season_year,applicant_hash)
);
CREATE TABLE IF NOT EXISTS registrations (
  id TEXT PRIMARY KEY,
  season_round_id TEXT NOT NULL REFERENCES season_rounds(id),
  season_year INTEGER NOT NULL,
  applicant_hash TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('university','community')),
  stage_name TEXT NOT NULL,
  demo_storage_ref TEXT,
  proof_storage_ref TEXT,
  payment_status TEXT NOT NULL DEFAULT 'not_verified' CHECK(payment_status IN ('not_verified','under_review','confirmed','rejected')),
  review_status TEXT NOT NULL DEFAULT 'draft' CHECK(review_status IN ('draft','submitted','needs_correction','eligible','waitlisted','qualified','rejected','withdrawn')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  CHECK(updated_at>=created_at),
  FOREIGN KEY(season_year,applicant_hash) REFERENCES applicant_year_registry(season_year,applicant_hash),
  UNIQUE(season_round_id,applicant_hash)
);
CREATE INDEX IF NOT EXISTS idx_registrations_round_review
  ON registrations(season_round_id,category,review_status);
CREATE INDEX IF NOT EXISTS idx_registrations_payment
  ON registrations(payment_status);
-- No 'paid=true' from client; payment status must be approved by a trusted operator.
-- Storage refs must never be unrestricted public URLs to identity or payment documents.
-- Identity access, multi-step registration service and payment verification not implemented yet.
CREATE TRIGGER IF NOT EXISTS reject_locked_or_mismatched_category
BEFORE INSERT ON registrations
FOR EACH ROW
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM applicant_year_registry y
    JOIN season_rounds r ON r.id=NEW.season_round_id
    WHERE y.season_year=NEW.season_year
      AND y.applicant_hash=NEW.applicant_hash
      AND y.category=NEW.category
      AND y.finalist_locked=0
      AND r.season_year=NEW.season_year
      AND r.round_type='qualifier'
  ) THEN RAISE(ABORT,'category_conflict_or_finalist_locked') END;
END;
