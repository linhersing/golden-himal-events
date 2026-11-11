-- ADDITIVE TEST ONLY: apply to isolated E2E_DB after Time Travel bookmark/backup.
-- Do NOT apply to legacy ghv-staging DB. No change to existing applications.
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS e2e_application_contacts (
 application_id TEXT PRIMARY KEY REFERENCES e2e_applications(id) ON DELETE CASCADE,
 contact_email TEXT NOT NULL CHECK(length(contact_email) BETWEEN 3 AND 250),
 contact_phone TEXT NOT NULL CHECK(length(contact_phone) BETWEEN 8 AND 30),
 consent_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL
);
-- No public contact indexes; organizer reads by scoped application IDs.
