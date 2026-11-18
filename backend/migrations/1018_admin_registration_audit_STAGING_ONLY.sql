-- Isolated E2E TEST database only. Verify backup and restore point before applying.
-- Fail before installing guards if earlier competition migrations are missing.
SELECT 1 FROM e2e_demo_2027_scores LIMIT 0;
SELECT 1 FROM e2e_january_demo_test_rosters LIMIT 0;
CREATE TABLE IF NOT EXISTS e2e_removed_member_media (
  object_key TEXT PRIMARY KEY,
  queued_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS e2e_registration_controls (
  application_id TEXT PRIMARY KEY REFERENCES e2e_applications(id) ON DELETE CASCADE,
  state TEXT NOT NULL CHECK(state IN ('active','disabled','deleted')),
  previous_status TEXT NOT NULL,
  version INTEGER NOT NULL CHECK(version>0),
  last_event_id TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS e2e_staff_audit (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,
  actor_role TEXT NOT NULL CHECK(actor_role IN ('member','reviewer','organizer')),
  target_id TEXT,
  action TEXT NOT NULL CHECK(action IN ('search','edit','disable','delete','restore','audit_read')),
  result TEXT NOT NULL CHECK(result IN ('success','denied','invalid','conflict','missing','protected','failed')),
  occurred_at INTEGER NOT NULL,
  diff TEXT CHECK(diff IS NULL OR json_valid(diff))
);
CREATE INDEX IF NOT EXISTS e2e_staff_audit_target_time ON e2e_staff_audit(target_id,occurred_at DESC);
CREATE TRIGGER IF NOT EXISTS e2e_staff_audit_no_update BEFORE UPDATE ON e2e_staff_audit
BEGIN SELECT RAISE(ABORT,'staff_audit_append_only'); END;
CREATE TRIGGER IF NOT EXISTS e2e_staff_audit_no_delete BEFORE DELETE ON e2e_staff_audit
BEGIN SELECT RAISE(ABORT,'staff_audit_append_only'); END;

CREATE VIEW IF NOT EXISTS e2e_admin_registrations AS
SELECT p.id,p.round_code,p.category,p.stage_name,p.affiliation,p.song_title,p.phase,p.status,p.updated_at,
 COALESCE(c.state,'active') AS state,COALESCE(c.version,0) AS version,
 CASE WHEN p.phase<>'demo' OR p.status IN ('scored','shortlisted','reserve')
  OR EXISTS(SELECT 1 FROM e2e_judge_scores s WHERE s.application_id=p.id)
  OR EXISTS(SELECT 1 FROM e2e_live_scores s WHERE s.application_id=p.id)
  OR EXISTS(SELECT 1 FROM e2e_demo_2027_scores s WHERE s.application_id=p.id)
  OR EXISTS(SELECT 1 FROM e2e_promotion_events s WHERE s.application_id=p.id)
  OR EXISTS(SELECT 1 FROM e2e_january_demo_test_rosters r,json_each(r.roster) j
   WHERE json_extract(j.value,'$.application_id')=p.id)
 THEN 1 ELSE 0 END AS protected
FROM e2e_applications p LEFT JOIN e2e_registration_controls c ON c.application_id=p.id;

CREATE TRIGGER IF NOT EXISTS e2e_managed_registration_preserve_delete
BEFORE DELETE ON e2e_applications
WHEN EXISTS(SELECT 1 FROM e2e_admin_registrations a WHERE a.id=OLD.id AND (a.state<>'active' OR a.protected=1))
BEGIN SELECT RAISE(ABORT,'managed_registration_preserved'); END;

CREATE TRIGGER IF NOT EXISTS e2e_inactive_registration_preserve_status
BEFORE UPDATE ON e2e_applications
WHEN OLD.status='withdrawn' AND EXISTS(
 SELECT 1 FROM e2e_registration_controls c WHERE c.application_id=OLD.id AND c.state<>'active')
 AND (NEW.status<>OLD.status OR NEW.phase<>OLD.phase OR NEW.stage_name<>OLD.stage_name OR NEW.affiliation<>OLD.affiliation)
BEGIN SELECT RAISE(ABORT,'inactive_registration'); END;
CREATE TRIGGER IF NOT EXISTS e2e_judge_scores_inactive_guard
BEFORE INSERT ON e2e_judge_scores
WHEN EXISTS(SELECT 1 FROM e2e_registration_controls c WHERE c.application_id=NEW.application_id AND c.state<>'active')
BEGIN SELECT RAISE(ABORT,'inactive_registration'); END;
CREATE TRIGGER IF NOT EXISTS e2e_live_scores_inactive_guard
BEFORE INSERT ON e2e_live_scores
WHEN EXISTS(SELECT 1 FROM e2e_registration_controls c WHERE c.application_id=NEW.application_id AND c.state<>'active')
BEGIN SELECT RAISE(ABORT,'inactive_registration'); END;
CREATE TRIGGER IF NOT EXISTS e2e_demo_2027_scores_inactive_guard
BEFORE INSERT ON e2e_demo_2027_scores
WHEN EXISTS(SELECT 1 FROM e2e_registration_controls c WHERE c.application_id=NEW.application_id AND c.state<>'active')
BEGIN SELECT RAISE(ABORT,'inactive_registration'); END;
CREATE TRIGGER IF NOT EXISTS e2e_promotion_events_inactive_guard
BEFORE INSERT ON e2e_promotion_events
WHEN EXISTS(SELECT 1 FROM e2e_registration_controls c WHERE c.application_id=NEW.application_id AND c.state<>'active')
BEGIN SELECT RAISE(ABORT,'inactive_registration'); END;
-- Keep optimistic concurrency tokens distinct across legacy and staff writes.
CREATE TRIGGER IF NOT EXISTS e2e_admin_monotonic_timestamp
AFTER UPDATE ON e2e_applications WHEN NEW.updated_at<=OLD.updated_at
BEGIN
 UPDATE e2e_applications SET updated_at=OLD.updated_at+1 WHERE id=NEW.id;
END;
