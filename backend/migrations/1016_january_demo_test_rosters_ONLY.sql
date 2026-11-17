-- One audit snapshot per TEST region. Scores and applications remain in their existing tables.
CREATE TABLE IF NOT EXISTS e2e_january_demo_test_rosters (
 region TEXT PRIMARY KEY CHECK(region IN ('A','B')),
 organizer_id TEXT NOT NULL REFERENCES e2e_accounts(id),
 published_at INTEGER NOT NULL,
 seat_limit INTEGER NOT NULL CHECK(seat_limit>0),
 roster TEXT NOT NULL CHECK(json_valid(roster))
);
