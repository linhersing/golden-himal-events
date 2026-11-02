# Private practice corrections Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans in this session. The user authorized execution of the agreed schedule; no additional approval of this implementation note is required.

**Goal:** Organizer-requested single correction within 48h plus explicit private pass backup.
**Architecture:** One additive per-application correction/audit table and SQL guards in the existing migration; role-scoped Worker routes; a focused frontend module integrated into existing member/Organizer cards. No additional external service.
**Tech Stack:** Worker JS, D1/SQLite, existing browser UI and Node/Playwright tests.
**Spec:** docs/superpowers/specs/2026-11-02-practice-supplement.md

## Global Constraints
- Preserve existing URLs, workspaces, legacy DB and all official service gates.
- Exactly 172800 seconds from manual-notification acknowledgement; one request and one submission.
- Only work_url/contact_phone/contact_handle/affiliation may change; no song/group/identity changes.
- No correction after any score; no score/promotion while pending or expired.
- Never save role passes in source, logs or shared minutes.

## Review Focus
- Cross-member / cross-workspace access and snapshot exposure to judges.
- Concurrent correction submissions and request versus initial judge score.
- Expiry at the exact second and changes to client-provided deadline.
- Lost response after a committed correction: reload shows completion, no duplicate mutation.
- Existing deployed migration rerun must preserve data and provision guards atomically enough to fail closed.

### Task 1: Complete correction workflow
**Files:** backend/practice.js; backend/migrations/1002_private_practice_ONLY.sql; scripts/provision-practice.mjs; public/practice-supplement.js; public/practice.js; public/practice.css; tests/practice-supplement.test.mjs; tests/practice-browser.spec.mjs; tests/practice-provision.test.mjs; scripts/live-practice-smoke.mjs.
**Interfaces:** POST supplement-request {application_id,reason,notified_manually:true}; POST supplement {application_id,work_url,contact_phone,contact_handle,affiliation}; GET me returns scoped supplements with computed pending/completed/expired status and server time. UI consumes these and invokes existing action/load helpers.
- [ ] Add SQLite/Worker tests for request→correction→readback, ownership, 48h boundary, immutable fields, duplicate writes, judging locks and additive migration; run them and observe missing-route failures.
- [ ] Implement additive schema/guards and Worker routes; run targeted tests to green.
- [ ] Add browser flow and failure/readback tests before the UI; observe missing-controls failure in CI if local browser unavailable; integrate localized UI and status.
- [ ] Run npm test, build, privacy scan; commit source and retain browser/remote acceptance gates.

### Task 2: Private pass backup
**Files:** public/practice-pass-backup.js; public/practice.html; public/practice.js; tests/practice-pass-backup.test.mjs; tests/practice-browser.spec.mjs.
**Interfaces:** buildPracticePassBackup(workspaceId, passes) returns private plain text after validating all six role keys/codes; UI gathers only currently visible creation-time codes.
- [ ] Test backup content/complete role validation, run and observe missing helper failure.
- [ ] Add helper and explicit copy/download controls, clear with existing hide/logout lifecycle.
- [ ] Run suite/build/privacy/browser checks, review diff and create PR; inspect all CI before integration.
