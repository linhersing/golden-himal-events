-- Add actual locations without rebuilding the referenced legacy application table.
CREATE TABLE IF NOT EXISTS e2e_application_locations (
 application_id TEXT PRIMARY KEY REFERENCES e2e_applications(id) ON DELETE CASCADE,
 province TEXT NOT NULL CHECK(province IN ('koshi','madhesh','bagmati','gandaki','lumbini','karnali','sudurpashchim')),
 detail TEXT NOT NULL CHECK(length(trim(detail)) BETWEEN 2 AND 120)
);
