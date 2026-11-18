-- Issue #98, isolated synthetic E2E TEST only. Never run via shared deploy provisioning.
SELECT 1 FROM e2e_frontline_2027_registration LIMIT 0;
SELECT 1 FROM e2e_test_application_approvals LIMIT 0;

-- Independent ledger intentionally survives deletion of the source application.
-- The staged marker is written before R2 PUT; keys never leave this ledger.
CREATE TABLE IF NOT EXISTS e2e_private_eligibility_objects (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  expected_revision TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  digest TEXT,
  mime TEXT NOT NULL CHECK(mime IN ('image/jpeg','image/png','application/pdf')),
  size INTEGER NOT NULL CHECK(size BETWEEN 1 AND 5242880),
  state TEXT NOT NULL CHECK(state IN ('staged','current','removed','deleted')),
  expires_at INTEGER NOT NULL,
  lease_until INTEGER NOT NULL,
  delete_after INTEGER NOT NULL DEFAULT 0,
  UNIQUE(application_id,request_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS e2e_private_eligibility_current
 ON e2e_private_eligibility_objects(application_id) WHERE state='current';
CREATE INDEX IF NOT EXISTS e2e_private_eligibility_cleanup
 ON e2e_private_eligibility_objects(state,delete_after,expires_at,lease_until);
CREATE TRIGGER IF NOT EXISTS e2e_private_eligibility_replace
 BEFORE UPDATE OF state ON e2e_private_eligibility_objects
 WHEN OLD.state='staged' AND NEW.state='current'
 BEGIN
  UPDATE e2e_private_eligibility_objects SET state='removed',delete_after=0,digest=NULL
   WHERE application_id=OLD.application_id AND state='current' AND id<>OLD.id;
 END;
CREATE TRIGGER IF NOT EXISTS e2e_private_eligibility_retire
 AFTER DELETE ON e2e_applications
 BEGIN
  UPDATE e2e_private_eligibility_objects
   SET state='removed',delete_after=CASE WHEN state='staged' THEN lease_until ELSE 0 END,digest=NULL
   WHERE application_id=OLD.id AND state IN ('staged','current');
 END;
