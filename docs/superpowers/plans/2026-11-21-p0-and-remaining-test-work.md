# P0 registration and remaining TEST work implementation plan

> **For agentic workers:** Use superpowers:executing-plans for inline execution and one final independent review. Independent diagnostic work may use superpowers:dispatching-parallel-agents with disjoint file ownership.

**Goal:** Continue the remaining authorized engineering while keeping human verification, usable member registration and invited staff/final-review access as P0 release conditions.

**Architecture:** Retain the existing Worker, D1 APIs, public URLs and role guards. Ship reversible no-schema fixes independently. New result-ledger, document or ballot schemas remain in controlled TEST until their separate remote verification and policy gates are satisfied.

**Tech stack:** Node24, existing ES modules, SQLite/D1, Cloudflare workerd, Playwright Microsoft Edge.

**Spec:** User instructions through 2026-11-21; existing Drive MASTER/AI_BRIDGE and formal53; latest Muse decision keeps earlier judging frontline-managed. The user explicitly requested direct execution without additional design approval rounds.

## Global constraints

- Only goldenhimalpalace.com is the frontend/UAT entry. Browser automation uses Edge.
- No reset/clean of other work; existing linked worktree was clean at dbdd5ee.
- General public TEST members do not need email invitations; staff still do.
- Do not weaken server Turnstile, OTP rate limits, sessions, private data or score locks.
- No official money, public voting or real identity-document upload activation.
- No direct shared remote schema mutation; preserve existing registrations and grades.
- Append milestones and failures to existing Drive MASTER/BRIDGE/general03 and verify readback. Do not check formal53 items without formal evidence.
- Synthetic challenge callbacks, fixture sessions and local D1 are never real-human or physical-phone acceptance.

## Review focus

- CF110200 must identify a hostname configuration failure instead of blaming a visitor's ad blocker.
- Expired or failed challenge callbacks cannot leave a usable previous token or enabled OTP send button.
- Non-invited public/password members must still type and save their own nine private fields.
- Historical and current video representations must not diverge after a one-time48h supplement.
- Legacy tests must follow approved single-group/no-payment/final-only policy, not reintroduce old rules to make tests green.

## Task A: P0 human verification diagnostics and release acceptance

Files: new public/human-verification-status.js and tests/human-verification-status.test.mjs; public/simple.js; public/page-locale.js; public/password-member.js as required; existing public-email and same-email-role browser tests; scripts/staff-test-remote-readiness.mjs; docs/release-checklist.md.

- [ ] Write failing classifier/browser tests for domain/key configuration, generic challenge failure, expiry and blocked script; verify actual failure before changes.
- [ ] Classify only public numeric codes, preserve token clearing and fail-closed controls; provide Chinese/English/Nepali messages without injecting keys, tokens or private input.
- [ ] Make existing read-only readiness check target the main domain; distinguish capability from human acceptance.
- [ ] Replace obsolete release checklist claims with evidence requirements for member/staff/scores and rollback, leaving manual steps pending.
- [ ] Run Node, relevant Edge/workerd tests and privacy/build checks; independent review, separate PR/CI. Authorized reversible production fix follows trusted build/backup/preservation.

## Task B: Five-demo48h supplement consistency

Files: backend/test-video-supplement.js, new focused regression tests, docs supplement acceptance. Preserve 1009 schema and existing API compatibility unless evidence demands otherwise.

- [ ] Reproduce whether correcting the first/main video leaves e2e_demo_2027_videos stale.
- [ ] If confirmed, make the supplement transaction update the canonical demo row(s) and legacy first-demo projection together, only for the owner, pending approval, within48h and once.
- [ ] Cover foreign owner/staff denial, duplicate submission, expiry, scored/approved locks, validation and rollback after database failure; verify actual DB/API readback and original other demos unchanged.
- [ ] Add phone/desktop UI coverage if the API contract requires a UI change; keep real notification delivery explicitly unaccepted until tested. Separate PR and review, no new schema.

## Task C: Remaining-stage/document/ballot gap reconciliation

- [ ] Inspect PR178/188/189/190 by commit without checking them out over current work.
- [ ] Reuse their proven components; record exact gaps, role requirements and pending frontline decisions.
- [ ] Implement independently testable safe gaps only after the interface is known; no invented quotas, voter eligibility or result-entry policy.
- [ ] Treat remote isolated deployment credentials, actual phone/human tests and unresolved policy as explicit remaining gates, while completing all independent development.

## Task D: Full regression truth

Files: legacy brand/frontline/responsive/compact-filter browser specs, where their expectations are demonstrably superseded by approved current behavior.

- [ ] Audit the17 remaining failures against current code and latest requirements.
- [ ] Update obsolete expectations without deleting meaningful assertions or changing product behavior to match old fees/categories.
- [ ] Run the whole browser suite, relevant workerd/D1 flows and source/dist privacy scan. Record exact PASS/FAIL and physical-device limitations.

## Delivery ledger

Started: clean isolated worktree, branch codex/p0-registration-acceptance-20261121, base dbdd5eee41a2ae4cb4a809acf8396ba54612af46. Drive start entry written and read back. Production changes, tests, deployment and unresolved gates will be recorded as they occur.
