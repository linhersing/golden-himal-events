# Practice attendance Implementation Plan
> **For agentic workers:** Use superpowers:executing-plans. Leo explicitly authorized continuation of the schedule; execute in this session and request a fresh whole-branch review before integration.

**Goal:** Cloud-backed48h/24h attendance and reserve reconciliation, with auditable named tie decisions.
**Architecture:** Additive pool/slot/ballot tables and SQL guards; focused admission Worker module; localized UI module; existing me/auth/action boundaries; scheduled handler and five-minute cron. Keep source-stage rankings immutable after publication.
**Tech Stack:** Workers, D1/SQLite, Node tests, existing Playwright CI.
**Spec:** docs/superpowers/specs/2026-11-02-practice-attendance.md

## Global Constraints
- TEST ONLY, no outbound notifications, payments, identity service or global Access change.
- Per round/category: Demo25+5, qualifier8+2;48h primary,24h reserve after confirmed manual notification.
- Exact server deadline and7days pre-final lock; no arbitrarily shortened window.
- One published immutable pool; member ownership; no post-publication manual bypass.
- Preserve legacy workspaces, source URLs and existing score comparison policy.

## Review Focus
- Concurrent confirmations/reconciliation cannot overbook or skip higher reserves.
- Automated reserve selection must not start a timer before manual notice.
- No visitor/cron expiry and exact second of deadline/lock.
- Changed tie cohorts, conflicting judges and other-judge ballot/contact disclosure.
- Lost response after committed publish/confirm and partial migrations.

### Task1: State machine and named decisions
**Files:** backend/practice-admission.js, backend/practice-ranking.js (export comparator only), backend/practice.js, backend/migrations/1002_private_practice_ONLY.sql, scripts/provision-practice.mjs, tests/practice-admission.test.mjs, tests/practice-provision.test.mjs.
**Interfaces:** POST admission-publish {source_phase,round_code,category,event_at,notified_manually:true}; admission-notify {pool_id,application_id,notified_manually:true}; admission-respond {pool_id,application_id,response:'confirm'|'decline'}; tie-ballot {tie_key,order:[application_id...]}; GET me includes scoped admission pools/slots/ties. reconcileAdmissions(db,workspaceId?) handles time; runPracticeSchedule(env) is feature-gated.
- [ ] Write real SQLite/Worker failing tests and observe missing route/state.
- [ ] Implement schema/atomic guards, scoped routes/ranking decisions and reconciliation; run tests to green.
- [ ] Run complete Node suite and preserve legacy behavior.

### Task2: UI and independent timer
**Files:** public/practice-admission.js, public/practice.html, public/practice.js, public/practice.css, backend/staging-registration-worker.js, wrangler.jsonc, tests/practice-browser.spec.mjs, scripts/live-practice-smoke.mjs.
**Interfaces:** append member/Organizer admission view; judge tie-ballot UI; Nepal event input; scheduled handler calls feature-gated reconciliation.
- [ ] Add browser tests for publish/confirm, manual reserve notice, lost response and named ballot privacy before UI changes.
- [ ] Implement localized controls and status; add cron without altering service gates.
- [ ] Full suite/build/privacy and browser CI; independent source review; fix significant findings, create/merge checked PR, verify exact deployed revision and real D1 flow.
- [ ] Append actual results and remaining formal gates toMASTER/BRIDGE.
