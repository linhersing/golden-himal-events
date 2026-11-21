-- NEW disposable fictional TEST database only. Never included in brand provisioning.
CREATE TABLE vote_test_round(
 id INTEGER PRIMARY KEY CHECK(id=1),state TEXT NOT NULL CHECK(state IN ('draft','open','closed','frozen')),
 version INTEGER NOT NULL DEFAULT 0,opens_at INTEGER,closes_at INTEGER,last_event TEXT,result TEXT CHECK(result IS NULL OR json_valid(result))
);
CREATE TABLE vote_test_candidates(
 application_id TEXT PRIMARY KEY REFERENCES e2e_applications(id) ON DELETE RESTRICT,
 public_id TEXT NOT NULL UNIQUE,public_name TEXT NOT NULL,video_url TEXT NOT NULL,ready INTEGER NOT NULL DEFAULT 0 CHECK(ready IN (0,1))
);
CREATE TABLE vote_test_eligibility(
 id TEXT PRIMARY KEY,person_hash TEXT NOT NULL UNIQUE,credential_hash TEXT NOT NULL UNIQUE,
 issuer_id TEXT NOT NULL REFERENCES e2e_accounts(id) ON DELETE RESTRICT,issue_request_id TEXT NOT NULL,issue_event TEXT NOT NULL,revoked INTEGER NOT NULL DEFAULT 0 CHECK(revoked IN (0,1)),UNIQUE(issuer_id,issue_request_id)
);
CREATE TABLE vote_test_ballots(
 receipt TEXT PRIMARY KEY,eligibility_id TEXT NOT NULL UNIQUE REFERENCES vote_test_eligibility(id) ON DELETE RESTRICT,
 candidate_id TEXT NOT NULL REFERENCES vote_test_candidates(public_id) ON DELETE RESTRICT,
 request_id TEXT NOT NULL,payload_hash TEXT NOT NULL,cast_at INTEGER NOT NULL
);
CREATE TABLE vote_test_decisions(
 seq INTEGER PRIMARY KEY AUTOINCREMENT,receipt TEXT NOT NULL REFERENCES vote_test_ballots(receipt) ON DELETE RESTRICT,
 verdict TEXT NOT NULL CHECK(verdict IN ('invalidate','reinstate')),reason TEXT NOT NULL CHECK(reason IN ('evidence_review','operator_error','test_duplicate')),
 event_id TEXT NOT NULL UNIQUE
);
CREATE TABLE vote_test_audit(
 id TEXT PRIMARY KEY,actor TEXT NOT NULL,action TEXT NOT NULL,target TEXT NOT NULL,detail TEXT NOT NULL CHECK(json_valid(detail)),created_at INTEGER NOT NULL
);
CREATE TABLE vote_test_rate_limits(key TEXT NOT NULL,bucket INTEGER NOT NULL,n INTEGER NOT NULL,PRIMARY KEY(key,bucket));
CREATE TRIGGER vote_test_audit_update BEFORE UPDATE ON vote_test_audit BEGIN SELECT RAISE(ABORT,'immutable_vote_audit');END;
CREATE TRIGGER vote_test_audit_delete BEFORE DELETE ON vote_test_audit BEGIN SELECT RAISE(ABORT,'immutable_vote_audit');END;
CREATE TRIGGER vote_test_ballot_update BEFORE UPDATE ON vote_test_ballots BEGIN SELECT RAISE(ABORT,'immutable_vote_ballot');END;
CREATE TRIGGER vote_test_ballot_delete BEFORE DELETE ON vote_test_ballots BEGIN SELECT RAISE(ABORT,'immutable_vote_ballot');END;
CREATE TRIGGER vote_test_decision_update BEFORE UPDATE ON vote_test_decisions BEGIN SELECT RAISE(ABORT,'immutable_vote_decision');END;
CREATE TRIGGER vote_test_decision_delete BEFORE DELETE ON vote_test_decisions BEGIN SELECT RAISE(ABORT,'immutable_vote_decision');END;
CREATE TRIGGER vote_test_frozen_round BEFORE UPDATE ON vote_test_round WHEN OLD.state='frozen' BEGIN SELECT RAISE(ABORT,'immutable_vote_result');END;
CREATE TRIGGER vote_test_candidate_update BEFORE UPDATE ON vote_test_candidates WHEN (SELECT state FROM vote_test_round WHERE id=1)<>'draft' BEGIN SELECT RAISE(ABORT,'candidate_snapshot_locked');END;
CREATE TRIGGER vote_test_candidate_delete BEFORE DELETE ON vote_test_candidates BEGIN SELECT RAISE(ABORT,'candidate_snapshot_locked');END;
CREATE TRIGGER vote_test_ballot_guard BEFORE INSERT ON vote_test_ballots BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM vote_test_round r,vote_test_eligibility e,vote_test_candidates c
 WHERE r.id=1 AND r.state='open' AND r.opens_at<=NEW.cast_at AND NEW.cast_at<r.closes_at
 AND e.id=NEW.eligibility_id AND e.revoked=0 AND c.public_id=NEW.candidate_id AND c.ready=1)
 THEN RAISE(ABORT,'ineligible_vote') END;
END;
CREATE TRIGGER vote_test_decision_guard BEFORE INSERT ON vote_test_decisions WHEN (SELECT state FROM vote_test_round WHERE id=1)='frozen' BEGIN SELECT RAISE(ABORT,'immutable_vote_result');END;
CREATE TRIGGER vote_test_revoke_guard BEFORE UPDATE ON vote_test_eligibility WHEN (SELECT state FROM vote_test_round WHERE id=1)='frozen' BEGIN SELECT RAISE(ABORT,'immutable_vote_result');END;
