-- NEW disposable fictional stage TEST D1 only; never brand provisioning.
SELECT scope FROM stage_test_scope LIMIT 0;
CREATE TABLE frontline_test_handoffs(
 id TEXT PRIMARY KEY,actor_id TEXT NOT NULL,request_id TEXT NOT NULL,payload_hash TEXT NOT NULL,
 source_reference TEXT NOT NULL,preview_fingerprint TEXT NOT NULL,manifest TEXT NOT NULL CHECK(json_valid(manifest)),
 created_at INTEGER NOT NULL,stage TEXT NOT NULL UNIQUE CHECK(stage='final'),
 UNIQUE(actor_id,request_id)
);
CREATE TRIGGER frontline_test_handoff_no_update BEFORE UPDATE ON frontline_test_handoffs BEGIN SELECT RAISE(ABORT,'immutable_frontline_handoff');END;
CREATE TRIGGER frontline_test_handoff_no_delete BEFORE DELETE ON frontline_test_handoffs BEGIN SELECT RAISE(ABORT,'immutable_frontline_handoff');END;
