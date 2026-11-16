-- 2026-11-16 TEST-ONLY price revision. DO NOT APPLY TO PRODUCTION.
-- Preserve historical simulated NPR 500 rows as originally recorded (50000 paisa).
-- New simulated Demo entries use NPR 300 (30000 paisa). Zero real payment gateways.
-- Apply to the isolated E2E D1 staging database BEFORE publishing the
-- backend/staging-e2e.js NPR 300 update; backup D1 and verify counts first.
-- The original 1000 migration remains immutable for historical provenance.
-- A one-time table rebuild is required because SQLite cannot ALTER a CHECK constraint.
CREATE TABLE IF NOT EXISTS e2e_payment_events_npr300_new (
 id TEXT PRIMARY KEY,
 application_id TEXT NOT NULL UNIQUE REFERENCES e2e_applications(id) ON DELETE CASCADE,
 event_type TEXT NOT NULL CHECK(event_type='SIMULATED_PAYMENT'),
 amount_paisa INTEGER NOT NULL DEFAULT 30000 CHECK(amount_paisa IN (30000,50000)),
 created_at INTEGER NOT NULL
);
INSERT OR IGNORE INTO e2e_payment_events_npr300_new(id,application_id,event_type,amount_paisa,created_at)
 SELECT id,application_id,event_type,amount_paisa,created_at FROM e2e_payment_events;
DROP TABLE e2e_payment_events;
ALTER TABLE e2e_payment_events_npr300_new RENAME TO e2e_payment_events;
