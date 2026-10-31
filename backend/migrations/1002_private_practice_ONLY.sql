-- Synthetic private practice only. Additive; never changes legacy/e2e/architecture tables.
CREATE TABLE IF NOT EXISTS ghv_practice_workspaces (
 id TEXT PRIMARY KEY, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS ghv_practice_actors (
 workspace_id TEXT NOT NULL REFERENCES ghv_practice_workspaces(id) ON DELETE CASCADE,
 actor_id TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('member','judge','organizer')),
 recovery_hash TEXT NOT NULL UNIQUE, PRIMARY KEY(workspace_id,actor_id)
);
CREATE TABLE IF NOT EXISTS ghv_practice_sessions (
 session_hash TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, actor_id TEXT NOT NULL, expires_at INTEGER NOT NULL,
 FOREIGN KEY(workspace_id,actor_id) REFERENCES ghv_practice_actors(workspace_id,actor_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS ghv_practice_sessions_actor ON ghv_practice_sessions(workspace_id,actor_id);
CREATE TABLE IF NOT EXISTS ghv_practice_applications (
 id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, actor_id TEXT NOT NULL,
 stage_name TEXT NOT NULL, round_code TEXT NOT NULL CHECK(round_code IN ('2027-01','2027-04')),
 category TEXT NOT NULL CHECK(category IN ('university','community')), province TEXT NOT NULL,
 song_title TEXT NOT NULL, original_artist TEXT NOT NULL, work_url TEXT NOT NULL,
 phase TEXT NOT NULL DEFAULT 'demo' CHECK(phase IN ('demo','qualifier','final')),
 fee_status TEXT NOT NULL DEFAULT 'deferred' CHECK(fee_status IN ('deferred','simulation_only')),
 created_at INTEGER NOT NULL, UNIQUE(workspace_id,actor_id), UNIQUE(id,workspace_id),
 FOREIGN KEY(workspace_id,actor_id) REFERENCES ghv_practice_actors(workspace_id,actor_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS ghv_practice_scores (
 workspace_id TEXT NOT NULL, application_id TEXT NOT NULL, judge_id TEXT NOT NULL,
 phase TEXT NOT NULL CHECK(phase IN ('demo','qualifier','final')),
 technique INTEGER NOT NULL CHECK(technique>=0), interpretation INTEGER NOT NULL CHECK(interpretation>=0),
 stage_presence INTEGER NOT NULL CHECK(stage_presence>=0), appearance INTEGER NOT NULL CHECK(appearance>=0),
 created_at INTEGER NOT NULL, PRIMARY KEY(workspace_id,application_id,judge_id,phase),
 CHECK((phase='demo' AND technique<=60 AND interpretation<=40 AND stage_presence=0 AND appearance=0)
 OR (phase IN ('qualifier','final') AND technique<=40 AND interpretation<=30 AND stage_presence<=20 AND appearance<=10)),
 FOREIGN KEY(application_id,workspace_id) REFERENCES ghv_practice_applications(id,workspace_id) ON DELETE CASCADE,
 FOREIGN KEY(workspace_id,judge_id) REFERENCES ghv_practice_actors(workspace_id,actor_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS ghv_practice_votes (
 workspace_id TEXT NOT NULL, voter_id TEXT NOT NULL, application_id TEXT NOT NULL, created_at INTEGER NOT NULL,
 PRIMARY KEY(workspace_id,voter_id),
 FOREIGN KEY(application_id,workspace_id) REFERENCES ghv_practice_applications(id,workspace_id) ON DELETE CASCADE,
 FOREIGN KEY(workspace_id,voter_id) REFERENCES ghv_practice_actors(workspace_id,actor_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS ghv_practice_events (
 workspace_id TEXT NOT NULL REFERENCES ghv_practice_workspaces(id) ON DELETE CASCADE,
 application_id TEXT NOT NULL, kind TEXT NOT NULL, phase TEXT NOT NULL, created_at INTEGER NOT NULL,
 PRIMARY KEY(workspace_id,application_id,kind,phase),
 FOREIGN KEY(application_id,workspace_id) REFERENCES ghv_practice_applications(id,workspace_id) ON DELETE CASCADE
);
CREATE TRIGGER IF NOT EXISTS ghv_practice_score_guard BEFORE INSERT ON ghv_practice_scores BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM ghv_practice_actors WHERE workspace_id=NEW.workspace_id AND actor_id=NEW.judge_id AND role='judge')
 OR NOT EXISTS(SELECT 1 FROM ghv_practice_applications WHERE id=NEW.application_id AND workspace_id=NEW.workspace_id AND phase=NEW.phase)
 THEN RAISE(ABORT,'invalid_practice_score') END;
END;
CREATE TRIGGER IF NOT EXISTS ghv_practice_promotion_guard BEFORE UPDATE OF phase ON ghv_practice_applications WHEN NEW.phase!=OLD.phase BEGIN
 SELECT CASE WHEN NOT ((OLD.phase='demo' AND NEW.phase='qualifier') OR (OLD.phase='qualifier' AND NEW.phase='final'))
 OR (SELECT COUNT(*) FROM ghv_practice_scores WHERE application_id=OLD.id AND workspace_id=OLD.workspace_id AND phase=OLD.phase)!=3
 THEN RAISE(ABORT,'three_judges_and_next_phase_required') END;
END;
CREATE TRIGGER IF NOT EXISTS ghv_practice_promotion_event AFTER UPDATE OF phase ON ghv_practice_applications WHEN NEW.phase!=OLD.phase BEGIN
 INSERT INTO ghv_practice_events(workspace_id,application_id,kind,phase,created_at) VALUES(OLD.workspace_id,OLD.id,'promotion',OLD.phase,unixepoch());
END;
CREATE TRIGGER IF NOT EXISTS ghv_practice_vote_guard BEFORE INSERT ON ghv_practice_votes BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM ghv_practice_actors WHERE workspace_id=NEW.workspace_id AND actor_id=NEW.voter_id AND role='member')
 OR NOT EXISTS(SELECT 1 FROM ghv_practice_applications WHERE id=NEW.application_id AND workspace_id=NEW.workspace_id AND phase='final' AND actor_id!=NEW.voter_id)
 THEN RAISE(ABORT,'invalid_practice_vote') END;
END;
