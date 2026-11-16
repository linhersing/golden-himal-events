-- Golden Himal Voice 2027 / 2026-11-16 frontline Word / STAGING ONLY
-- Part 2 additive extension. Never rebuild or overwrite legacy 1000_* TEST tables.
-- Do not run against production or an existing DB before snapshot and restore rehearsal.
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS e2e_frontline_2027_registration (
  application_id TEXT PRIMARY KEY NOT NULL
    REFERENCES e2e_applications(id) ON DELETE CASCADE,
  competition_region TEXT NOT NULL CHECK(competition_region IN ('A','B')),
  eligibility_basis TEXT NOT NULL CHECK(eligibility_basis IN ('enrolled','graduated')),
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS e2e_frontline_2027_region
  ON e2e_frontline_2027_registration(competition_region);

-- competition_region A=Lumbini, B=Bagmati; this is the chosen
-- venue/contest region, NOT the entrant's residence province.
-- 'enrolled'/'graduated' are credentials for ONE unified competition group.
-- Legacy e2e_applications.category cannot yet be removed because historical
-- E2E rows and stage quota triggers require the university/community enum.
-- Following migration must explicitly replace legacy category-dependent guards,
-- judges, quotas, and promotion models before formal 2027 launch.
