# Architecture Preview Implementation Plan

> **For agentic workers:** Execute in this session with superpowers:executing-plans.

**Goal:** A direct no-login view of the whole website journey while email and fee collection are postponed.
**Architecture:** Dedicated fictional D1 fixture, read-only Worker projection, lightweight three-language HTML/CSS/JS. No authenticated account seeding or bypass.
**Tech Stack:** Existing Worker ESM, isolated D1, vanilla JS, Node SQLite, browser CI.
**Spec:** docs/superpowers/specs/2026-10-31-architecture-preview-design.md

## Global Constraints
- Email/password/payment remain deferred; no new service signup or recurring cost.
- Never touch old ghv-staging or real e2e member data. Preview uses distinct tables.
- Never claim example scores or votes came from actual judges/voters.

## Review Focus
- DB unavailable/incomplete: explicit error, no browser data fallback.
- Public endpoint: GET-only, exact fixture projection, no private e2e table reads.
- Single D1 fixture produces deterministic69.8/90.2 example totals.
- 320/360/375/390/428px, EN/ne/zh, all views: no horizontal overflow.
- Role tabs do not sign in or mutate scores, promotions or votes.

## Tasks
- [x] Observe failing GET/write/SQLite tests, implement additive fixture and read-only endpoint; focused tests pass.
- [x] Build accessible participant/judge/organizer views, explicit deferred boundaries, homepage entrance and browser regressions.
- [ ] Independent review, full Node/build/privacy and browser CI.
- [ ] Bookmark isolated D1, apply additive preview migration, read back6/2/18 without changing e2e accounts.
- [ ] Merge, inspect real Cloudflare deployment and direct D1-backed page; append shared records and deliver live URL.

## Review fixes
- April was missing from the example data: regression failed on two January entries; second fictional entry now usesApril and focused suite passes.
- Phase changes recreated the focused button. Preserve focus on the selected phase control so keyboard review can continue; browser regression checks focus.
- Actual cloud/member/email/payment acceptance remains separate and deferred.
