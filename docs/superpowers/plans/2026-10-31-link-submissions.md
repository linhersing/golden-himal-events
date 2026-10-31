# Link Submissions Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement in this session, as explicitly requested by the owner.

**Goal:** Submit performance URLs without R2 or a payment method.

**Architecture:** Explicit STAGING_SUBMISSION_MODE=links changes only the synthetic acceptance path. Existing demo_url holds links; legacy upload behavior remains available only outside link mode. OTP and role gates remain closed until configured.

**Tech Stack:** Existing Worker ESM, D1 SQL, vanilla JS, Node SQLite tests, GitHub CI.

**Spec:** docs/superpowers/specs/2026-10-31-link-submissions-design.md

## Global Constraints
- No migration, legacy DB edits, subscription, real payments, public registration, fake OTP, or secret in source.
- Documents are not collected or verified in link-mode rehearsal.
- No server fetch of user URLs; only external HTTPS navigation.

## Review Focus
- Empty, credential-bearing, overlong and local links: reject before a DB insert.
- Google Drive and short social links: persist exactly, return after a new authenticated session.
- Missing documents: allow synthetic link scoring only in explicit link mode; legacy mode retains gates.
- Unauthorized and stale-stage writes: existing independent-score and promotion tests must continue passing.
- Narrow multilingual UI and long links: no overflow, hidden upload controls, localized status.

## Tasks
- [x] Run the baseline (73 Node tests), add link-mode SQLite and readiness regression tests; observe failures.
- [x] Implement bounded HTTPS validation, required links, upload rejection, optional R2 readiness, link-only review criteria.
- [x] Replace upload UI with links, permission guidance and unverified-document notices in all three languages; add browser regressions.
- [ ] Run full Node suite, build/privacy checks, independent code review and GitHub browser CI; merge and inspect the actual Cloudflare deployment/readiness without enabling registration.
- [ ] Append evidence and remaining Email blockers to both shared Google Docs.
