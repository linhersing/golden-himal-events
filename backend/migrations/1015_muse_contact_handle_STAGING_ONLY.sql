-- Additive only, 2026-11-17 frontline Word requires a preferred contact account.
-- Apply after 1013 and a D1 backup; no real data should be accepted while feature is OFF.
ALTER TABLE e2e_muse_audition_details
 ADD COLUMN contact_handle TEXT NOT NULL DEFAULT '' CHECK(length(contact_handle) <= 160);
