-- OPTIONAL STAGING-ONLY additive migration. Apply to isolated Cloudflare D1 AFTER verified backup.
-- This file is not run automatically by CI and must not change live user data until approved.
-- Do not re-run the original 1000 baseline migration over existing tables.
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS e2e_application_profiles (
 application_id TEXT PRIMARY KEY NOT NULL REFERENCES e2e_applications(id) ON DELETE CASCADE,
 gender TEXT CHECK(gender IN ('male','female','other','prefer_not_say') OR gender IS NULL),
 photo_url_1 TEXT,
 photo_url_2 TEXT,
 photo_url_3 TEXT,
 consent_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL
);
