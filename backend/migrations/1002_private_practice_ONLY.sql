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
 contact_phone TEXT NOT NULL, contact_handle TEXT NOT NULL, birth_date TEXT,
 affiliation TEXT NOT NULL, song_language TEXT NOT NULL, song_key TEXT NOT NULL,
 priority_ack INTEGER NOT NULL CHECK(priority_ack=1),media_ack INTEGER NOT NULL CHECK(media_ack=1),
 phase TEXT NOT NULL DEFAULT 'demo' CHECK(phase IN ('demo','qualifier','final')),
 fee_status TEXT NOT NULL DEFAULT 'deferred' CHECK(fee_status IN ('deferred','simulation_only')),
 created_at INTEGER NOT NULL, UNIQUE(workspace_id,actor_id,round_code), UNIQUE(id,workspace_id),
 FOREIGN KEY(workspace_id,actor_id) REFERENCES ghv_practice_actors(workspace_id,actor_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS ghv_practice_scores (
 workspace_id TEXT NOT NULL, application_id TEXT NOT NULL, judge_id TEXT NOT NULL,
 phase TEXT NOT NULL CHECK(phase IN ('demo','qualifier','final')),
 technique INTEGER NOT NULL CHECK(technique>=0), interpretation INTEGER NOT NULL CHECK(interpretation>=0),
 stage_presence INTEGER NOT NULL CHECK(stage_presence>=0), appearance INTEGER NOT NULL CHECK(appearance>=0),
 recused INTEGER NOT NULL DEFAULT 0 CHECK(recused IN (0,1)),reason TEXT,
 created_at INTEGER NOT NULL, PRIMARY KEY(workspace_id,application_id,judge_id,phase),
 CHECK(recused=0 OR (technique=0 AND interpretation=0 AND stage_presence=0 AND appearance=0 AND length(trim(reason)) BETWEEN 1 AND 200)),
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
 OR (SELECT COUNT(*) FROM ghv_practice_scores WHERE application_id=OLD.id AND workspace_id=OLD.workspace_id AND phase=OLD.phase AND recused=0)=0
 OR (NEW.phase='final' AND EXISTS(SELECT 1 FROM ghv_practice_applications WHERE workspace_id=OLD.workspace_id AND actor_id=OLD.actor_id AND id!=OLD.id AND phase='final'))
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

CREATE TRIGGER IF NOT EXISTS ghv_practice_application_guard BEFORE INSERT ON ghv_practice_applications BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM ghv_practice_applications WHERE workspace_id=NEW.workspace_id AND actor_id=NEW.actor_id AND (category!=NEW.category OR phase='final' OR (category='community' AND birth_date!=NEW.birth_date))) THEN RAISE(ABORT,'annual_category_or_final_lock') END;
END;

CREATE TABLE IF NOT EXISTS ghv_practice_vouchers (
 id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL,account_id TEXT NOT NULL,season_year INTEGER NOT NULL CHECK(season_year=2027),application_id TEXT NOT NULL,face_value_npr INTEGER NOT NULL DEFAULT 10000 CHECK(face_value_npr=10000),status TEXT NOT NULL DEFAULT 'NOT_REDEEMABLE' CHECK(status='NOT_REDEEMABLE'),created_at INTEGER NOT NULL,UNIQUE(workspace_id,account_id,season_year),
 FOREIGN KEY(workspace_id,account_id) REFERENCES ghv_practice_actors(workspace_id,actor_id) ON DELETE CASCADE,FOREIGN KEY(application_id,workspace_id) REFERENCES ghv_practice_applications(id,workspace_id) ON DELETE CASCADE
);
CREATE TRIGGER IF NOT EXISTS ghv_practice_voucher_guard BEFORE INSERT ON ghv_practice_vouchers BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM ghv_practice_applications WHERE id=NEW.application_id AND workspace_id=NEW.workspace_id AND actor_id=NEW.account_id AND fee_status='simulation_only') THEN RAISE(ABORT,'simulated_fee_required') END;
END;
