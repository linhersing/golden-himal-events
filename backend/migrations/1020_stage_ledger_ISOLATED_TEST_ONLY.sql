-- New empty isolated TEST D1 only. Not listed by the brand provisioning script.
-- Authentication uses the existing staff-session mechanism in this same isolated DB.
PRAGMA foreign_keys=ON;
CREATE TABLE stage_test_scope(scope TEXT PRIMARY KEY CHECK(scope='FICTIONAL_STAGE_TEST_ONLY'));
CREATE TABLE stage_test_rounds(
 code TEXT PRIMARY KEY CHECK(code IN ('audition','qualifier_one','qualifier_two','regional_pk','final')),
 status TEXT NOT NULL CHECK(status IN ('locked','open','frozen')),version INTEGER NOT NULL DEFAULT 0,
 panel TEXT NOT NULL CHECK(json_valid(panel)),config TEXT NOT NULL CHECK(json_valid(config)),
 result TEXT CHECK(result IS NULL OR json_valid(result)),last_event TEXT
);
CREATE TABLE stage_test_units(
 stage TEXT NOT NULL REFERENCES stage_test_rounds(code) ON DELETE RESTRICT,id TEXT NOT NULL,
 label TEXT NOT NULL,region TEXT NOT NULL CHECK(region IN ('A','B')),positions INTEGER NOT NULL CHECK(positions BETWEEN 1 AND 5),
 PRIMARY KEY(stage,id)
);
CREATE TABLE stage_test_members(
 stage TEXT NOT NULL,unit_id TEXT NOT NULL,application_id TEXT NOT NULL REFERENCES e2e_applications(id) ON DELETE RESTRICT,
 PRIMARY KEY(stage,application_id),FOREIGN KEY(stage,unit_id) REFERENCES stage_test_units(stage,id) ON DELETE RESTRICT
);
CREATE TABLE stage_test_scores(
 stage TEXT NOT NULL,unit_id TEXT NOT NULL,position INTEGER NOT NULL CHECK(position BETWEEN 1 AND 5),
 judge_id TEXT NOT NULL REFERENCES e2e_accounts(id) ON DELETE RESTRICT,values_json TEXT NOT NULL CHECK(json_valid(values_json)),
 event_id TEXT NOT NULL UNIQUE,created_at INTEGER NOT NULL,
 PRIMARY KEY(stage,unit_id,position,judge_id),FOREIGN KEY(stage,unit_id) REFERENCES stage_test_units(stage,id) ON DELETE RESTRICT
);
CREATE TABLE stage_test_audit(
 id TEXT PRIMARY KEY,actor_id TEXT NOT NULL,actor_role TEXT NOT NULL,request_id TEXT NOT NULL,
 payload_hash TEXT NOT NULL,action TEXT NOT NULL,stage TEXT NOT NULL,result TEXT NOT NULL,
 detail TEXT NOT NULL CHECK(json_valid(detail)),created_at INTEGER NOT NULL,
 UNIQUE(actor_id,request_id)
);
CREATE TABLE stage_test_training(
 application_id TEXT PRIMARY KEY REFERENCES e2e_applications(id) ON DELETE RESTRICT,
 opt_in INTEGER NOT NULL CHECK(opt_in IN (0,1)),last_event TEXT NOT NULL
);
CREATE TRIGGER stage_test_audit_no_update BEFORE UPDATE ON stage_test_audit BEGIN SELECT RAISE(ABORT,'immutable_stage_audit');END;
CREATE TRIGGER stage_test_audit_no_delete BEFORE DELETE ON stage_test_audit BEGIN SELECT RAISE(ABORT,'immutable_stage_audit');END;
CREATE TRIGGER stage_test_score_no_update BEFORE UPDATE ON stage_test_scores BEGIN SELECT RAISE(ABORT,'immutable_stage_score');END;
CREATE TRIGGER stage_test_score_no_delete BEFORE DELETE ON stage_test_scores BEGIN SELECT RAISE(ABORT,'immutable_stage_score');END;
CREATE TRIGGER stage_test_frozen_round BEFORE UPDATE ON stage_test_rounds WHEN OLD.status='frozen' BEGIN SELECT RAISE(ABORT,'immutable_stage_result');END;
CREATE TRIGGER stage_test_freeze_guard BEFORE UPDATE OF status ON stage_test_rounds WHEN NEW.status='frozen' BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM stage_test_members m JOIN e2e_applications a ON a.id=m.application_id LEFT JOIN e2e_registration_controls c ON c.application_id=a.id
  WHERE m.stage=NEW.code AND (a.status IN ('withdrawn','rejected') OR COALESCE(c.state,'active')<>'active')) THEN RAISE(ABORT,'inactive_stage_member') END;
END;
CREATE TRIGGER stage_test_score_guard BEFORE INSERT ON stage_test_scores BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM stage_test_rounds r JOIN json_each(r.panel) j
  WHERE r.code=NEW.stage AND r.status='open' AND j.value=NEW.judge_id)
  OR NOT EXISTS(SELECT 1 FROM stage_test_units u WHERE u.stage=NEW.stage AND u.id=NEW.unit_id AND NEW.position<=u.positions)
  OR EXISTS(SELECT 1 FROM stage_test_members m JOIN e2e_applications a ON a.id=m.application_id
   LEFT JOIN e2e_registration_controls c ON c.application_id=a.id
   WHERE m.stage=NEW.stage AND m.unit_id=NEW.unit_id AND (a.status IN ('withdrawn','rejected') OR COALESCE(c.state,'active')<>'active'))
  OR EXISTS(SELECT 1 FROM stage_test_members m JOIN e2e_applications a ON a.id=m.application_id WHERE m.stage=NEW.stage AND m.unit_id=NEW.unit_id AND a.account_id=NEW.judge_id)
 THEN RAISE(ABORT,'stage_score_guard') END;
END;
CREATE TRIGGER stage_test_preserve_insert BEFORE INSERT ON e2e_registration_controls
 WHEN NEW.state<>'active' AND EXISTS(SELECT 1 FROM stage_test_members m JOIN stage_test_scores s ON s.stage=m.stage AND s.unit_id=m.unit_id WHERE m.application_id=NEW.application_id)
 BEGIN SELECT RAISE(ABORT,'stage_record_protected');END;
CREATE TRIGGER stage_test_preserve_update BEFORE UPDATE OF state ON e2e_registration_controls
 WHEN NEW.state<>'active' AND EXISTS(SELECT 1 FROM stage_test_members m JOIN stage_test_scores s ON s.stage=m.stage AND s.unit_id=m.unit_id WHERE m.application_id=NEW.application_id)
 BEGIN SELECT RAISE(ABORT,'stage_record_protected');END;
