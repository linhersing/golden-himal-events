-- Muse sample form 2026-11-17: ADDITIVE STAGING ONLY. Require D1 backup and privacy review before enabling flag.
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS e2e_muse_audition_details(
 application_id TEXT PRIMARY KEY NOT NULL REFERENCES e2e_applications(id) ON DELETE CASCADE,
 full_name TEXT NOT NULL CHECK(length(trim(full_name)) BETWEEN 2 AND 120),
 contact_phone TEXT NOT NULL CHECK(length(trim(contact_phone)) BETWEEN 7 AND 32),
 contact_email TEXT NOT NULL CHECK(length(trim(contact_email)) BETWEEN 5 AND 180),
 city TEXT NOT NULL CHECK(length(trim(city)) BETWEEN 2 AND 100),
 street_address TEXT NOT NULL CHECK(length(trim(street_address)) BETWEEN 2 AND 160),
 educational_background TEXT NOT NULL CHECK(length(trim(educational_background)) BETWEEN 2 AND 400),
 short_description TEXT NOT NULL CHECK(length(trim(short_description)) BETWEEN 2 AND 500),
 musical_training TEXT NOT NULL CHECK(length(trim(musical_training)) BETWEEN 2 AND 400),
 updated_at INTEGER NOT NULL
);
