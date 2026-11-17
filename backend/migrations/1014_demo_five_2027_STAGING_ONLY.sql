-- Additive 2027 five-demo model; STAGING ONLY. Back up D1 before applying.
-- Do NOT release until per-video reviewer scoring, best-score calculation and
-- applicant ownership checks are end-to-end verified.
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS e2e_demo_2027_videos(
 application_id TEXT NOT NULL REFERENCES e2e_applications(id) ON DELETE CASCADE,
 position INTEGER NOT NULL CHECK(position BETWEEN 1 AND 5),
 song_title TEXT NOT NULL CHECK(length(song_title) BETWEEN 1 AND 100),
 original_artist TEXT NOT NULL CHECK(length(original_artist) BETWEEN 1 AND 100),
 song_language TEXT NOT NULL,
 demo_url TEXT NOT NULL CHECK(length(demo_url) BETWEEN 10 AND 1000),
 updated_at INTEGER NOT NULL,
 PRIMARY KEY(application_id,position)
);
CREATE TABLE IF NOT EXISTS e2e_demo_2027_scores(
 application_id TEXT NOT NULL,
 position INTEGER NOT NULL,
 reviewer_id TEXT NOT NULL REFERENCES e2e_accounts(id) ON DELETE CASCADE,
 technique INTEGER NOT NULL CHECK(technique BETWEEN 0 AND 60),
 interpretation INTEGER NOT NULL CHECK(interpretation BETWEEN 0 AND 40),
 created_at INTEGER NOT NULL,
 PRIMARY KEY(application_id,position,reviewer_id),
 FOREIGN KEY(application_id,position) REFERENCES e2e_demo_2027_videos(application_id,position) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS e2e_demo_2027_judge_by_application
 ON e2e_demo_2027_scores(application_id,position);
