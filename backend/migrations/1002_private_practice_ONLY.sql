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

-- Additive correction window; existing applications and scores are preserved.
CREATE TABLE IF NOT EXISTS ghv_practice_supplements (
 workspace_id TEXT NOT NULL, application_id TEXT NOT NULL,
 requested_by TEXT NOT NULL, reason TEXT NOT NULL CHECK(length(trim(reason)) BETWEEN 1 AND 300),
 requested_at INTEGER NOT NULL, deadline_at INTEGER NOT NULL CHECK(deadline_at=requested_at+172800),
 notification_method TEXT NOT NULL DEFAULT 'manual_test' CHECK(notification_method='manual_test'),
 original_values TEXT NOT NULL, completed_at INTEGER, corrected_values TEXT,
 PRIMARY KEY(workspace_id,application_id),
 CHECK((completed_at IS NULL AND corrected_values IS NULL) OR (completed_at>=requested_at AND completed_at<deadline_at AND corrected_values IS NOT NULL)),
 FOREIGN KEY(application_id,workspace_id) REFERENCES ghv_practice_applications(id,workspace_id) ON DELETE CASCADE,
 FOREIGN KEY(workspace_id,requested_by) REFERENCES ghv_practice_actors(workspace_id,actor_id) ON DELETE CASCADE
);
CREATE TRIGGER IF NOT EXISTS ghv_practice_supplement_request_guard BEFORE INSERT ON ghv_practice_supplements BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM ghv_practice_actors WHERE workspace_id=NEW.workspace_id AND actor_id=NEW.requested_by AND role='organizer')
 OR NOT EXISTS(SELECT 1 FROM ghv_practice_applications WHERE id=NEW.application_id AND workspace_id=NEW.workspace_id AND phase='demo'
 AND json_object('work_url',work_url,'contact_phone',contact_phone,'contact_handle',contact_handle,'affiliation',affiliation)=NEW.original_values)
 OR EXISTS(SELECT 1 FROM ghv_practice_scores WHERE application_id=NEW.application_id AND workspace_id=NEW.workspace_id)
 OR NEW.completed_at IS NOT NULL OR NEW.corrected_values IS NOT NULL
 THEN RAISE(ABORT,'supplement_request_locked') END;
END;
CREATE TRIGGER IF NOT EXISTS ghv_practice_supplement_edit_guard BEFORE UPDATE OF work_url,contact_phone,contact_handle,affiliation ON ghv_practice_applications BEGIN
 SELECT CASE WHEN OLD.phase!='demo'
 OR EXISTS(SELECT 1 FROM ghv_practice_scores WHERE application_id=OLD.id AND workspace_id=OLD.workspace_id)
 OR NOT EXISTS(SELECT 1 FROM ghv_practice_supplements WHERE application_id=OLD.id AND workspace_id=OLD.workspace_id AND completed_at IS NULL AND deadline_at>unixepoch())
 THEN RAISE(ABORT,'supplement_edit_locked') END;
END;
CREATE TRIGGER IF NOT EXISTS ghv_practice_supplement_completed AFTER UPDATE OF work_url,contact_phone,contact_handle,affiliation ON ghv_practice_applications BEGIN
 UPDATE ghv_practice_supplements SET completed_at=unixepoch(),corrected_values=json_object('work_url',NEW.work_url,'contact_phone',NEW.contact_phone,'contact_handle',NEW.contact_handle,'affiliation',NEW.affiliation)
 WHERE application_id=NEW.id AND workspace_id=NEW.workspace_id AND completed_at IS NULL;
 INSERT INTO ghv_practice_events(workspace_id,application_id,kind,phase,created_at) VALUES(NEW.workspace_id,NEW.id,'supplement_completed','demo',unixepoch());
END;
CREATE TRIGGER IF NOT EXISTS ghv_practice_supplement_score_guard BEFORE INSERT ON ghv_practice_scores
 WHEN EXISTS(SELECT 1 FROM ghv_practice_supplements WHERE application_id=NEW.application_id AND workspace_id=NEW.workspace_id AND completed_at IS NULL) BEGIN
 SELECT RAISE(ABORT,'supplement_unresolved');
END;
CREATE TRIGGER IF NOT EXISTS ghv_practice_supplement_promotion_guard BEFORE UPDATE OF phase ON ghv_practice_applications
 WHEN NEW.phase!=OLD.phase AND EXISTS(SELECT 1 FROM ghv_practice_supplements WHERE application_id=OLD.id AND workspace_id=OLD.workspace_id AND completed_at IS NULL) BEGIN
 SELECT RAISE(ABORT,'supplement_unresolved');
END;
CREATE TRIGGER IF NOT EXISTS ghv_practice_supplement_immutable BEFORE UPDATE ON ghv_practice_supplements BEGIN
 SELECT CASE WHEN OLD.completed_at IS NOT NULL OR NEW.completed_at IS NULL OR NEW.completed_at!=unixepoch()
 OR NEW.application_id!=OLD.application_id OR NEW.workspace_id!=OLD.workspace_id OR NEW.requested_by!=OLD.requested_by
 OR NEW.reason!=OLD.reason OR NEW.requested_at!=OLD.requested_at OR NEW.deadline_at!=OLD.deadline_at
 OR NEW.notification_method!=OLD.notification_method OR NEW.original_values!=OLD.original_values
 OR NOT EXISTS(SELECT 1 FROM ghv_practice_applications WHERE id=NEW.application_id AND workspace_id=NEW.workspace_id
 AND NEW.corrected_values=json_object('work_url',work_url,'contact_phone',contact_phone,'contact_handle',contact_handle,'affiliation',affiliation))
 THEN RAISE(ABORT,'supplement_audit_immutable') END;
END;

-- Admission is a separate, immutable published roster. No legacy tables change.
CREATE TABLE IF NOT EXISTS ghv_practice_admission_pools (
 id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL REFERENCES ghv_practice_workspaces(id) ON DELETE CASCADE,
 source_phase TEXT NOT NULL CHECK(source_phase IN ('demo','qualifier')),round_code TEXT NOT NULL,category TEXT NOT NULL,
 primary_limit INTEGER NOT NULL,reserve_limit INTEGER NOT NULL,target_count INTEGER NOT NULL,
 published_by TEXT NOT NULL,published_at INTEGER NOT NULL,event_at INTEGER NOT NULL,lock_at INTEGER NOT NULL,
 candidate_ids TEXT NOT NULL,ballot_revision INTEGER NOT NULL,
 UNIQUE(id,workspace_id),UNIQUE(workspace_id,source_phase,round_code,category),
 CHECK((source_phase='demo' AND primary_limit=25 AND reserve_limit=5 AND lock_at=event_at) OR (source_phase='qualifier' AND primary_limit=8 AND reserve_limit=2 AND lock_at=event_at-604800)),
 CHECK(target_count BETWEEN 1 AND primary_limit AND published_at+172800<=lock_at),
 FOREIGN KEY(workspace_id,published_by) REFERENCES ghv_practice_actors(workspace_id,actor_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS ghv_practice_admission_slots (
 pool_id TEXT NOT NULL,workspace_id TEXT NOT NULL,application_id TEXT NOT NULL,source_phase TEXT NOT NULL,
 merit_order INTEGER NOT NULL CHECK(merit_order>0),initial_kind TEXT NOT NULL CHECK(initial_kind IN ('primary','reserve')),
 status TEXT NOT NULL CHECK(status IN ('offered','waiting','awaiting_notice','confirmed','declined','expired')),
 notified_at INTEGER,deadline_at INTEGER,notice_by TEXT,responded_by TEXT,response_at INTEGER,
 PRIMARY KEY(pool_id,application_id),UNIQUE(pool_id,merit_order),UNIQUE(workspace_id,application_id,source_phase),
 CHECK((notified_at IS NULL AND deadline_at IS NULL) OR (notified_at IS NOT NULL AND deadline_at=notified_at+CASE initial_kind WHEN 'primary' THEN 172800 ELSE 86400 END)),
 FOREIGN KEY(pool_id,workspace_id) REFERENCES ghv_practice_admission_pools(id,workspace_id) ON DELETE CASCADE,
 FOREIGN KEY(application_id,workspace_id) REFERENCES ghv_practice_applications(id,workspace_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS ghv_practice_tie_ballots (
 id INTEGER PRIMARY KEY AUTOINCREMENT,workspace_id TEXT NOT NULL REFERENCES ghv_practice_workspaces(id) ON DELETE CASCADE,
 tie_key TEXT NOT NULL,source_phase TEXT NOT NULL,round_code TEXT NOT NULL,category TEXT NOT NULL,
 judge_id TEXT NOT NULL,ordering_json TEXT NOT NULL CHECK(json_valid(ordering_json)),created_at INTEGER NOT NULL,
 FOREIGN KEY(workspace_id,judge_id) REFERENCES ghv_practice_actors(workspace_id,actor_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS ghv_practice_tie_latest ON ghv_practice_tie_ballots(workspace_id,tie_key,judge_id,id);
CREATE TRIGGER IF NOT EXISTS ghv_practice_admission_pool_guard BEFORE INSERT ON ghv_practice_admission_pools BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM ghv_practice_actors WHERE workspace_id=NEW.workspace_id AND actor_id=NEW.published_by AND role='organizer')
 OR NEW.published_at!=unixepoch()
 OR NEW.ballot_revision!=(SELECT COALESCE(MAX(id),0) FROM ghv_practice_tie_ballots WHERE workspace_id=NEW.workspace_id AND source_phase=NEW.source_phase AND round_code=NEW.round_code AND category=NEW.category)
 OR (NEW.source_phase='qualifier' AND EXISTS(SELECT 1 FROM ghv_practice_admission_pools earlier JOIN ghv_practice_admission_slots s ON s.pool_id=earlier.id WHERE earlier.workspace_id=NEW.workspace_id AND earlier.source_phase='demo' AND earlier.round_code=NEW.round_code AND earlier.category=NEW.category AND ((s.status='offered' AND s.deadline_at>unixepoch()) OR (s.status='awaiting_notice' AND unixepoch()+86400<=earlier.lock_at))))
 OR NEW.candidate_ids!=(SELECT json_group_array(id) FROM (SELECT a.id FROM ghv_practice_applications a WHERE a.workspace_id=NEW.workspace_id AND a.phase=NEW.source_phase AND a.round_code=NEW.round_code AND a.category=NEW.category AND NOT EXISTS(SELECT 1 FROM ghv_practice_applications f WHERE f.workspace_id=a.workspace_id AND f.actor_id=a.actor_id AND f.phase='final' AND f.id!=a.id) ORDER BY a.id))
 THEN RAISE(ABORT,'admission_publication_changed') END;
END;
CREATE TRIGGER IF NOT EXISTS ghv_practice_admission_pool_immutable BEFORE UPDATE ON ghv_practice_admission_pools BEGIN
 SELECT RAISE(ABORT,'admission_pool_immutable');
END;
CREATE TRIGGER IF NOT EXISTS ghv_practice_admission_slot_insert BEFORE INSERT ON ghv_practice_admission_slots BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM ghv_practice_admission_pools p JOIN ghv_practice_applications a ON a.workspace_id=p.workspace_id AND a.id=NEW.application_id
 WHERE p.id=NEW.pool_id AND p.workspace_id=NEW.workspace_id AND p.source_phase=NEW.source_phase AND a.phase=p.source_phase AND a.round_code=p.round_code AND a.category=p.category
 AND NEW.merit_order<=p.primary_limit+p.reserve_limit
 AND ((NEW.initial_kind='primary' AND NEW.merit_order<=p.target_count AND NEW.status='offered' AND NEW.notified_at=p.published_at AND NEW.deadline_at=p.published_at+172800 AND NEW.notice_by=p.published_by)
 OR (NEW.initial_kind='reserve' AND NEW.merit_order>p.target_count AND NEW.status='waiting' AND NEW.notified_at IS NULL AND NEW.deadline_at IS NULL)))
 OR (SELECT COUNT(*) FROM ghv_practice_scores WHERE workspace_id=NEW.workspace_id AND application_id=NEW.application_id AND phase=NEW.source_phase)!=3
 OR NOT EXISTS(SELECT 1 FROM ghv_practice_scores WHERE workspace_id=NEW.workspace_id AND application_id=NEW.application_id AND phase=NEW.source_phase AND recused=0)
 OR EXISTS(SELECT 1 FROM ghv_practice_supplements WHERE workspace_id=NEW.workspace_id AND application_id=NEW.application_id AND completed_at IS NULL)
 THEN RAISE(ABORT,'admission_invalid_slot') END;
END;
CREATE TRIGGER IF NOT EXISTS ghv_practice_admission_slot_guard BEFORE UPDATE ON ghv_practice_admission_slots BEGIN
 SELECT CASE WHEN NEW.pool_id!=OLD.pool_id OR NEW.workspace_id!=OLD.workspace_id OR NEW.application_id!=OLD.application_id OR NEW.source_phase!=OLD.source_phase OR NEW.merit_order!=OLD.merit_order OR NEW.initial_kind!=OLD.initial_kind
 OR NOT (
 (OLD.status='waiting' AND NEW.status='awaiting_notice' AND OLD.initial_kind='reserve'
 AND EXISTS(SELECT 1 FROM ghv_practice_admission_pools p WHERE p.id=OLD.pool_id AND unixepoch()+86400<=p.lock_at AND (SELECT COUNT(*) FROM ghv_practice_admission_slots s WHERE s.pool_id=p.id AND s.status IN ('offered','awaiting_notice','confirmed'))<p.target_count)
 AND OLD.merit_order=(SELECT MIN(merit_order) FROM ghv_practice_admission_slots WHERE pool_id=OLD.pool_id AND status='waiting') AND NEW.notified_at IS NULL AND NEW.deadline_at IS NULL)
 OR (OLD.status='awaiting_notice' AND NEW.status='offered' AND NEW.notified_at=unixepoch() AND NEW.deadline_at=unixepoch()+86400 AND NEW.deadline_at<=(SELECT lock_at FROM ghv_practice_admission_pools WHERE id=OLD.pool_id)
 AND EXISTS(SELECT 1 FROM ghv_practice_actors WHERE workspace_id=OLD.workspace_id AND actor_id=NEW.notice_by AND role='organizer'))
 OR (OLD.status='offered' AND NEW.status IN ('confirmed','declined') AND unixepoch()<OLD.deadline_at AND unixepoch()<(SELECT lock_at FROM ghv_practice_admission_pools WHERE id=OLD.pool_id)
 AND NEW.response_at=unixepoch() AND NEW.responded_by=(SELECT actor_id FROM ghv_practice_applications WHERE id=OLD.application_id AND workspace_id=OLD.workspace_id)
 AND NEW.notified_at=OLD.notified_at AND NEW.deadline_at=OLD.deadline_at)
 OR (OLD.status='offered' AND NEW.status='expired' AND unixepoch()>=OLD.deadline_at AND NEW.response_at=unixepoch() AND NEW.responded_by IS NULL AND NEW.notified_at=OLD.notified_at AND NEW.deadline_at=OLD.deadline_at)
 ) THEN RAISE(ABORT,'admission_transition_locked') END;
END;
CREATE TRIGGER IF NOT EXISTS ghv_practice_admission_slot_event AFTER UPDATE ON ghv_practice_admission_slots BEGIN
 INSERT INTO ghv_practice_events(workspace_id,application_id,kind,phase,created_at) VALUES(NEW.workspace_id,NEW.application_id,'admission_'||NEW.status,NEW.source_phase,unixepoch());
 UPDATE ghv_practice_applications SET phase=CASE OLD.source_phase WHEN 'demo' THEN 'qualifier' ELSE 'final' END
 WHERE id=NEW.application_id AND workspace_id=NEW.workspace_id AND phase=OLD.source_phase AND NEW.status='confirmed';
END;
CREATE TRIGGER IF NOT EXISTS ghv_practice_admission_promotion_guard BEFORE UPDATE OF phase ON ghv_practice_applications WHEN NEW.phase!=OLD.phase BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM ghv_practice_admission_pools WHERE workspace_id=OLD.workspace_id AND source_phase=NEW.phase AND round_code=OLD.round_code AND category=OLD.category)
 THEN RAISE(ABORT,'admission_target_list_frozen') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM ghv_practice_admission_pools WHERE workspace_id=OLD.workspace_id AND source_phase=OLD.phase AND round_code=OLD.round_code AND category=OLD.category)
 AND NOT EXISTS(SELECT 1 FROM ghv_practice_admission_slots WHERE workspace_id=OLD.workspace_id AND application_id=OLD.id AND source_phase=OLD.phase AND status='confirmed')
 THEN RAISE(ABORT,'admission_confirmation_required') END;
END;
CREATE TRIGGER IF NOT EXISTS ghv_practice_admission_score_guard BEFORE INSERT ON ghv_practice_scores BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM ghv_practice_applications a JOIN ghv_practice_admission_pools p ON p.workspace_id=a.workspace_id AND p.source_phase=NEW.phase AND p.round_code=a.round_code AND p.category=a.category WHERE a.id=NEW.application_id AND a.workspace_id=NEW.workspace_id)
 THEN RAISE(ABORT,'admission_source_scores_frozen') END;
END;
CREATE TRIGGER IF NOT EXISTS ghv_practice_admission_application_guard BEFORE INSERT ON ghv_practice_applications BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM ghv_practice_admission_pools WHERE workspace_id=NEW.workspace_id AND source_phase='demo' AND round_code=NEW.round_code AND category=NEW.category)
 THEN RAISE(ABORT,'admission_applications_closed') END;
END;
CREATE TRIGGER IF NOT EXISTS ghv_practice_admission_ballot_guard BEFORE INSERT ON ghv_practice_tie_ballots BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM ghv_practice_actors WHERE workspace_id=NEW.workspace_id AND actor_id=NEW.judge_id AND role='judge')
 OR EXISTS(SELECT 1 FROM ghv_practice_admission_pools WHERE workspace_id=NEW.workspace_id AND source_phase=NEW.source_phase AND round_code=NEW.round_code AND category=NEW.category)
 THEN RAISE(ABORT,'admission_ballot_locked') END;
END;
