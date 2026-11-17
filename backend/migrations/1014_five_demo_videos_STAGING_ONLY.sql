-- 2026-11-17 Golden Himal 2027 January audition · TEST ONLY
-- Additive: videos 2–5 live beside legacy main video 1, preserving old
-- e2e_applications and e2e_judge_scores without rewriting graded history.
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS e2e_demo_videos (
 id TEXT PRIMARY KEY,
 application_id TEXT NOT NULL REFERENCES e2e_applications(id) ON DELETE CASCADE,
 video_index INTEGER NOT NULL CHECK(video_index BETWEEN 2 AND 5),
 song_title TEXT NOT NULL CHECK(length(song_title) BETWEEN 1 AND 100),
 original_artist TEXT NOT NULL CHECK(length(original_artist) BETWEEN 1 AND 100),
 song_language TEXT NOT NULL CHECK(length(song_language) BETWEEN 1 AND 60),
 demo_url TEXT NOT NULL CHECK(length(demo_url) BETWEEN 12 AND 1000),
 created_at INTEGER NOT NULL,
 UNIQUE(application_id,video_index),
 UNIQUE(application_id,demo_url)
);
CREATE INDEX IF NOT EXISTS e2e_demo_videos_lookup
 ON e2e_demo_videos(application_id,video_index);

CREATE TABLE IF NOT EXISTS e2e_extra_demo_scores (
 video_id TEXT NOT NULL REFERENCES e2e_demo_videos(id) ON DELETE CASCADE,
 reviewer_id TEXT NOT NULL REFERENCES e2e_accounts(id) ON DELETE CASCADE,
 technique INTEGER NOT NULL CHECK(technique BETWEEN 0 AND 60),
 interpretation INTEGER NOT NULL CHECK(interpretation BETWEEN 0 AND 40),
 conflict_checked INTEGER NOT NULL CHECK(conflict_checked=1),
 created_at INTEGER NOT NULL,
 PRIMARY KEY(video_id,reviewer_id)
);

-- Only the newly registered unified 2027/Jan demo may have more videos.
CREATE TRIGGER IF NOT EXISTS e2e_extra_demo_insert_guard
BEFORE INSERT ON e2e_demo_videos BEGIN
 SELECT RAISE(ABORT,'new_frontline_demo_only') WHERE NOT EXISTS(
  SELECT 1 FROM e2e_applications p
  JOIN e2e_frontline_2027_registration f ON f.application_id=p.id
  WHERE p.id=NEW.application_id AND p.round_code='2027-01'
   AND p.phase='demo' AND p.status IN ('submitted','under_review')
   AND p.demo_url IS NOT NULL AND p.demo_url<>NEW.demo_url
   AND NOT EXISTS(SELECT 1 FROM e2e_judge_scores s WHERE s.application_id=p.id)
   AND NOT EXISTS(SELECT 1 FROM e2e_promotion_events t WHERE t.application_id=p.id)
 );
END;
CREATE TRIGGER IF NOT EXISTS e2e_extra_demo_score_stage_guard
BEFORE INSERT ON e2e_extra_demo_scores BEGIN
 SELECT RAISE(ABORT,'stale_extra_demo_score') WHERE NOT EXISTS(
  SELECT 1 FROM e2e_demo_videos v
  JOIN e2e_applications p ON p.id=v.application_id
  WHERE v.id=NEW.video_id AND p.phase='demo'
    AND p.status NOT IN ('withdrawn','rejected')
 );
END;
-- Keep individual judge scores immutable and forbid silent overwrite.
CREATE TRIGGER IF NOT EXISTS e2e_extra_demo_score_immutable
BEFORE UPDATE ON e2e_extra_demo_scores BEGIN
 SELECT RAISE(ABORT,'immutable_extra_demo_score');
END;
