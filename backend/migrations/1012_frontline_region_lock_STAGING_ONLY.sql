-- Additive, fails closed for A/B cross-region re-entry. Requires D1 snapshot.
PRAGMA foreign_keys=ON;

-- TEST-only one-region consistency trigger for each verified account.
-- Historical region choices are not overwritten, and residency is independent.
-- Note: apply after a D1 backup; this trigger is only active after this migration.
CREATE TRIGGER IF NOT EXISTS e2e_frontline_2027_account_region_guard
BEFORE INSERT ON e2e_frontline_2027_registration
FOR EACH ROW
BEGIN
 SELECT RAISE(ABORT,'competition_region_locked')
 WHERE EXISTS(
  SELECT 1 FROM e2e_frontline_2027_registration locked
  JOIN e2e_applications existing ON existing.id=locked.application_id
  JOIN e2e_applications entrant ON entrant.id=NEW.application_id
  WHERE existing.account_id=entrant.account_id
    AND locked.competition_region<>NEW.competition_region
 );
END;
