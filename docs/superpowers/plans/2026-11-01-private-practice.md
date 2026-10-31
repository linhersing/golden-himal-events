# Private Practice Implementation Plan

> **For agentic workers:** Execute inline with superpowers:executing-plans. Owner explicitly instructed continued implementation; do not pause for another plan choice.

**Goal:** Functional no-email, D1-backed submission, independent judging and organizer practice.
**Architecture:** Isolated synthetic workspaces, distinct random per-role passes, HttpOnly sessions, dedicated bounded D1 tables, existing Worker.
**Tech Stack:** Worker ESM, D1/SQLite, vanilla JS/HTML/CSS, Node tests and Playwright.
**Spec:** docs/superpowers/specs/2026-11-01-private-practice-design.md

## Global Constraints
- No email proof, real money, R2, real personal data, redeemable vouchers, or public real registration.
- Do not change existing auth gates, legacyDB, e2e tables, or architecture fixture.
- Exact Origin on writes; hashed 256-bit credentials; only language preference in localStorage.

## Review Focus
- Cross-workspace/role access and caller-supplied role escalation must fail.
- Stale score/promotion and duplicate requests must not corrupt phase or counts.
- Incomplete final judging must never display a final combined total.
- Failed backend responses must preserve form input and never claim storage success.
- Recovery passes must survive another device while logout revokes only that session.

### Task1: Real handler, schema, isolation and business flow
Files: backend/practice.js, backend/migrations/1002_private_practice_ONLY.sql, backend/staging-registration-worker.js, tests/practice.test.mjs.
Interfaces: `handlePractice(request,env)` at `/api/staging/practice/*`, uses only `env.E2E_DB`, gated `STAGING_PRACTICE_ENABLED==='true'`. Routes readiness/create/login/logout/me/application/simulate-fee/score/promote/vote/cleanup. POST create returns six `{role,actor_id,pass}` plus session; login consumes `{pass}`. GET me returns exact role-specific persisted state. Score consumes app id and phase; promotion consumes expected phase. New migration defines all practice relations and guards.
- [ ] Write SQLite-backed tests for missing config/schema, create acknowledgement, exact Origin, role and workspace isolation, cross-device sessions/recovery, no legacy mutations.
- [ ] Run tests: observe404/missing-feature failure.
- [ ] Implement minimal bounded schema/handler with conditional writes, unique constraints and role-filtered queries.
- [ ] Add/run full two-member/three-judge, three-stage, vote, persisted-readback/cleanup tests. Include malformed links, stale phase and conflict, duplicate submission/fee/score/vote.
- [ ] Run complete Node suite, commit server deliverable.

### Task2: Functional mobile portal and homepage entrance
Files: public/practice.html/.css/.js, index.html, src/styles/site.css, tests/practice-browser.spec.mjs, browser workflow.
Interfaces consume Task1 routes, same-origin cookies; never use frontend identity assertions as authorization.
- [ ] Add browser flow assertions through real handler backed by local SQLite; observe missing-page failure.
- [ ] Implement trilingual authenticated role UI, once-only pass display, real submit/readback, role score inputs and organizer actions. No fee collection or browser fixture fallback.
- [ ] Run browser flows across separate contexts, EN/ne/zh and320/360/375/390/428px plus desktop; preserve input on server error; no script errors.
- [ ] Run full Node/build/privacy suite and commit frontend deliverable.

### Task3: Provision, deployment evidence and audit
Files: scripts/provision-practice.mjs, scripts/live-practice-smoke.mjs, package.json, wrangler.jsonc, .github/workflows/live-practice.yml, runbook.
- [ ] Test trusted-build gating and fail-closed fallback without credentials; no secret output.
- [ ] Provision solely in Cloudflare build with existing credentials after bookmark; additive SQL1002 only. Retain count and schema evidence without secrets.
- [ ] Fresh whole-branch review; fix important findings with regression tests.
- [ ] Publish reviewed PR, wait CI, merge authorized test branch, inspect live HTTP workflow (not fake email evidence), run synthetic remote flow and clean only its own workspace.
- [ ] Append results/limitations to BRIDGE and MASTER, deliver direct actionable URL.
