# Frontline manual final handoff implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** invited organizers can select existing fictional January applicants, preview and confirm a recorded frontline final roster, then use independent final grading and ballot rehearsal without preceding online scores.

**Architecture:** extend the existing isolated stage Worker and its staff OTP session, integrate PR197's read-only preview, persist one immutable handoff into new isolated-only tables and create ten final stage units atomically. No brand Worker, brand bindings, provisioning or existing application phases change.

**Tech Stack:** existing JavaScript, Cloudflare workerd/D1, SQLite, Playwright Microsoft Edge.

**Spec:** this document records the user's direct-execution choice and Codex's conservative proposal. Muse's offline early judging is established; the user's suggested final handoff remains a proposed operating workflow. This implementation is fictional TEST only, not evidence of Muse approving voter policy or real eligibility.

## Global constraints

- Preserve live SHA539dad4, all original URLs/data, signup/Turnstile/OTP/roles; no production migration or formal vote/payment/document switches.
- Only authenticated invited organizers may enumerate handoff applicants, preview, confirm and read the source record; judges see final stage performance information only.
- No earlier scores are required or carried forward. Optional paper scores are not modeled until stage-specific rules are settled; source reference is an opaque internal reference, not a public document or proof of custody.
- Ten distinct January accounts, approved active applications, five per area; validation and selection use IDs, never names. Final target must be empty/locked; no replace/delete operation.
- Confirm uses exact preview fingerprint, expected stage version and idempotency request ID; source changes between preview and commit must fail atomically. Read back committed audit and ten members before success.
- Every major decision/failure/test result appended to existing Drive documents and verified. Formal53 unchanged.

## Review focus

- Same performer names, duplicate accounts and changed approval/area/disabled state must not bypass checks.
- Concurrent confirmation or lost response must not duplicate or replace finalists.
- Guest/member/reviewer must not read the source manifest or commit; spoofed role values ignored.
- Existing scores/ballots/final units must block overwrite; injected D1 failure leaves no partial roster.
- Mobile layout, three locales, pending/failure/readback feedback, no localStorage credentials or PII.

## Tasks

- [ ] Write failing SQLite tests for immutable handoff, replay/conflict, snapshot races, source protections and independent final scores.
- [ ] Implement isolated1022 migration, organizer ledger and bounded authenticated HTTP handler; keep defaults off unless explicit rehearsal flag and scope.
- [ ] Add mobile-first trilingual handoff page, invitation-only link, selection/preview/acknowledgement/confirm/receipt flow. Implement missing behavior only after a failing browser/workerd test.
- [ ] Run full Node suite, build/privacy and Edge workerd flow (20 fictional applications, final grading and vote initialization, all viewport sizes, failure/retry and restore snapshot).
- [ ] Fresh-context whole-branch review, fix blockers with RED/GREEN; create independent draft PR based on193, document197 dependency and all deployment/UAT limits, archive evidence and Drive readback.

## Baseline / ledger

2026-11-22: existing linked worktree was clean, created codex/frontline-manual-handoff-20261122 from193 and merged197 without conflicts; no other worktrees changed. Baseline365Node:364PASS/0FAIL/1existing Windows skip. Main/live still539dad4. Earlier log commands referenced two nonexistent filenames; corrected discovery to actual isolated ledger/fixture files, no product mutation from those read failures.
