-- Read-only architecture showcase. Fictional personas, NOT registered/verified members.
-- Add only these dedicated preview tables to the isolated E2E_DB after a Time Travel bookmark.
CREATE TABLE IF NOT EXISTS architecture_preview_profiles (
 id TEXT PRIMARY KEY, fixture_set TEXT NOT NULL CHECK(fixture_set='architecture-20261031'),
 role TEXT NOT NULL CHECK(role IN ('participant','judge','organizer')), display_name TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS architecture_preview_applications (
 id TEXT PRIMARY KEY, fixture_set TEXT NOT NULL CHECK(fixture_set='architecture-20261031'),
 profile_id TEXT NOT NULL REFERENCES architecture_preview_profiles(id),
 round_code TEXT NOT NULL, category TEXT NOT NULL, province TEXT NOT NULL,
 song_title TEXT NOT NULL, original_artist TEXT NOT NULL, work_url TEXT,
 example_votes INTEGER NOT NULL CHECK(example_votes>=0)
);
CREATE TABLE IF NOT EXISTS architecture_preview_scores (
 fixture_set TEXT NOT NULL CHECK(fixture_set='architecture-20261031'),
 application_id TEXT NOT NULL REFERENCES architecture_preview_applications(id),
 judge_id TEXT NOT NULL REFERENCES architecture_preview_profiles(id),
 stage TEXT NOT NULL CHECK(stage IN ('demo','qualifier','final')),
 technique INTEGER NOT NULL, interpretation INTEGER NOT NULL, stage_presence INTEGER NOT NULL, appearance INTEGER NOT NULL,
 PRIMARY KEY(application_id,judge_id,stage)
);
INSERT OR IGNORE INTO architecture_preview_profiles VALUES
('DEMO-P1','architecture-20261031','participant','TEST MAYA'),
('DEMO-P2','architecture-20261031','participant','TEST ARUN'),
('DEMO-J1','architecture-20261031','judge','TEST JUDGE A'),
('DEMO-J2','architecture-20261031','judge','TEST JUDGE B'),
('DEMO-J3','architecture-20261031','judge','TEST JUDGE C'),
('DEMO-O1','architecture-20261031','organizer','TEST ORGANIZER');
INSERT OR IGNORE INTO architecture_preview_applications VALUES
('DEMO-GHV-001','architecture-20261031','DEMO-P1','2027-01','community','gandaki','FICTIONAL DEMO SONG','FICTIONAL ARTIST',NULL,60),
('DEMO-GHV-002','architecture-20261031','DEMO-P2','2027-04','community','bagmati','FICTIONAL DEMO SONG','FICTIONAL ARTIST',NULL,100);
INSERT OR IGNORE INTO architecture_preview_scores VALUES
('architecture-20261031','DEMO-GHV-001','DEMO-J1','demo',54,36,0,0),
('architecture-20261031','DEMO-GHV-001','DEMO-J2','demo',48,32,0,0),
('architecture-20261031','DEMO-GHV-001','DEMO-J3','demo',42,28,0,0),
('architecture-20261031','DEMO-GHV-001','DEMO-J1','qualifier',36,27,18,9),
('architecture-20261031','DEMO-GHV-001','DEMO-J2','qualifier',32,24,16,8),
('architecture-20261031','DEMO-GHV-001','DEMO-J3','qualifier',28,21,14,7),
('architecture-20261031','DEMO-GHV-001','DEMO-J1','final',36,27,18,9),
('architecture-20261031','DEMO-GHV-001','DEMO-J2','final',32,24,16,8),
('architecture-20261031','DEMO-GHV-001','DEMO-J3','final',28,21,14,7),
('architecture-20261031','DEMO-GHV-002','DEMO-J1','demo',54,36,0,0),
('architecture-20261031','DEMO-GHV-002','DEMO-J2','demo',48,32,0,0),
('architecture-20261031','DEMO-GHV-002','DEMO-J3','demo',42,28,0,0),
('architecture-20261031','DEMO-GHV-002','DEMO-J1','qualifier',36,27,18,9),
('architecture-20261031','DEMO-GHV-002','DEMO-J2','qualifier',32,24,16,8),
('architecture-20261031','DEMO-GHV-002','DEMO-J3','qualifier',28,21,14,7),
('architecture-20261031','DEMO-GHV-002','DEMO-J1','final',36,27,18,9),
('architecture-20261031','DEMO-GHV-002','DEMO-J2','final',32,24,16,8),
('architecture-20261031','DEMO-GHV-002','DEMO-J3','final',28,21,14,7);
