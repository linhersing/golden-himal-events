# Golden Himal Voice — closed final-vote security foundation (2026-11-16)

**Status: DRAFT CODE / ISOLATED REHEARSAL ONLY.** This module is NOT connected to the current Worker, public voting UI, singer registration or payment. It is a first implementation step for [Issue #112](https://github.com/linhersing/golden-himal-events/issues/112), not approval to launch 2027 voting.

## What this PR actually adds

- `backend/final-vote-security.js`: a fail-closed ballot function with **no public API route**. Existing `wrangler.jsonc`, site links, sessions, current Cloudflare D1 bindings and Worker entrypoint remain unchanged.
- Uses existing **draft** SQL `backend/migrations/0001_core.sql` and `0002_eligibility_credentials.sql` against a **new, isolated rehearsal database only**. An independent authorized issuer must first verify a unique person and privately issue that person a random eligibility credential. Email, IP, browser fingerprint and Turnstile alone are not proof of distinct real people.
- Server-side checks: exact HTTPS Origin, Cloudflare edge IP, rate limiting keyed by HMAC-masked IP and credential, Turnstile Siteverify with exact `ghv_final_vote` action and hostname, approved finalist, matching round, `open` voting window, timestamp from server and unrevoked credential.
- Atomic D1 `batch()` stores the vote together with an accepted-ballot audit event, or rolls back both. A unique key on round/eligibility blocks duplicate and concurrent ballots, even after changing the selected finalist. Raw Email, IP and credential are never stored in the ballot/audit tables by this module.
- `tests/final-vote-security.test.mjs`: 7 tests for closed-by-default, double vote, opening/closing, revoked eligibility, invalid candidate, Turnstile, rate limits, atomic audit failure and independent-voter uniqueness. Run: `node --test tests/final-vote-security.test.mjs`.

## Closed rehearsal dependencies (NOT configured or activated by this PR)

A future **authorized operator** may create a separate, non-public rehearsal Worker/environment with these bindings after review:

- `FINAL_VOTE_REHEARSAL_ENABLED=true` (absent means off)
- `FINAL_VOTE_REHEARSAL_DB` — distinct isolated D1 database, NOT `E2E_DB` or the live staging DB
- `FINAL_VOTE_CREDENTIAL_SECRET` — unique secret (32+ chars), never committed
- `FINAL_VOTE_TURNSTILE_SECRET` — private Turnstile widget secret restricted to rehearsal hostname
- `FINAL_VOTE_ALLOWED_ORIGIN` — exact approved HTTPS origin
- `FINAL_VOTE_RATE_LIMITER` — real Cloudflare rate-limit binding with an agreed quota

**Do not wire this module into `backend/staging-registration-worker.js`, deploy the two DRAFT schemas to an existing DB, or expose ballot APIs merely because tests passed.** No user credentials, OTPs, private mailbox values or database secrets belong in chat, Google Drive, screenshots or GitHub.

## Still required before official voting: explicit blockers

1. Organizer/王老師/Muse/Allen must **sign written contest rules**: who can vote, one vote per entire final or per category, voter age and region, voting start/end (Nepal time), display of live totals, no self-vote/proxy policy, 51%/49% final formula, tie-break order and 48-hour appeal process. Recent frontline discussions may have changed the final-round rules.
2. **Independent one-person eligibility issuance** is not implemented. SQL uniqueness only helps if a trusted authority prevents one person obtaining two independently issued credentials by using two Email accounts. Design accessible in-person and remote alternatives, privacy policy and appeal procedure before issuing anything real.
3. **Abnormal-vote review and independent audit** remain to be built: bounded, privacy-preserving anomaly queue; suspicious vote holding/removal with reason and second-person authorization; monitoring/incident response; signed immutable counts and final result snapshot; backup and restore.
4. **Final tally and judge acceptance** remain TEST only. The current 51/49 formula in `staging-v2-flow.js` is not an official result service. Confirm 3–5 independent judges, conflict recusal, one-time scoring, mobile/tablet outage recovery and reviewable audit. Track [Issue #111](https://github.com/linhersing/golden-himal-events/issues/111).
5. **Staff privileged-login Turnstile** lives in separate, currently unmerged [PR #90](https://github.com/linhersing/golden-himal-events/pull/90). It needs independent review, safe deployment, credential/session testing and rate limits. WAF, bot risk monitoring, live Cloudflare binding verification and practical load testing are additional prerequisites.
6. **Official voter interface and failure recovery** (including idempotency/receipt inquiry without revealing identity) do not yet exist. This first PR is NOT a publicly usable voting website.
7. **No live Cloudflare deployment or security penetration test** was performed by this change. Local tests use SQLite and a D1 transaction adapter; confirm actual D1 behavior in an isolated environment before even starting an invited rehearsal.

## Acceptance gates

No public voting unless the written policy, independent unique-voter check, Turnstile/WAF/rate limits, isolated D1 and schema migrations, honest voter receipt, disabled-after-cutoff controls, anomaly review, results freeze, two independent audit reviewers, judge acceptance, multi-device load tests, backup restore and authorization to launch are all documented and demonstrated.

Reference implementation boundaries: existing `backend/README.md`, `backend/migrations/0001_core.sql`, `backend/migrations/0002_eligibility_credentials.sql`, GitHub Issues #112 / #111 and Cloudflare official Turnstile Siteverify / D1 transaction documentation.
