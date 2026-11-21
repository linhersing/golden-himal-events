# Five-demo 48-hour supplement acceptance — 2026-11-21

Status: local regression verified; independent review, cloud update-log readback and release acceptance remain with the coordinating task. No deployment or remote database write was performed for this change.

## Reproduced failure

The authenticated `submit-video-supplement` route consumed the one-time window and updated `e2e_applications`, but did not update position 1 in `e2e_demo_2027_videos`. The member and organizer APIs therefore returned the corrected top-level link alongside the old `demo_entries[0]` link. The original eligibility predicate also allowed pending applications with existing score or promotion-history rows.

The first valid RED run of `node --test tests/five-demo-supplement-consistency.test.mjs` produced 14 passes and 9 failures: canonical-main consistency, promotion history before/after request, legacy score before/after request, per-video score before/after request, canonical failure rollback, and concurrent winner consistency. An earlier fixture setup run failed with `e2e_not_configured`; that setup error was corrected before the RED evidence was counted.

## Implemented behavior

- Preserve the existing organizer request and owner submission API, six correction fields, server-controlled 48-hour deadline and one-use window. The current form corrects the main video only; `demo_entries`, position, language and ownership fields remain rejected.
- Detect existing optional video/score tables independently of feature flags. When correcting the main link, title or artist, update canonical position 1 and its legacy projection in the same D1 batch that claims the supplement window. Existing positions 2–5 and their timestamps remain unchanged.
- Deny requests and submissions for approved, scored or promoted entries, including existing legacy/per-video scores and promotion history. Keep these checks inside the claim SQL so an entry locked after the organizer request cannot be corrected.
- Preserve legacy single-video entries with or without the optional canonical schema. Non-video corrections do not touch canonical video rows.
- Any database exception aborts the transaction, including the claimed window. The API returns its existing generic 503 response; retry remains possible after the database failure is resolved.

No schema, public UI, notification, authentication, Turnstile or judging-policy change is included. Full five-video editing would require a separate explicit UI/API contract; it was not added to a first-video correction endpoint.

## Verification

Tests use actual in-memory SQLite, unchanged migrations, server session checks and authenticated `handleE2E` requests. Fixture sessions and fictional member records are not real-person authentication acceptance. The new fixture runs with `STAGING_ONLINE_JUDGING_MODE=final_only`.

| Check | Result |
| --- | --- |
| First-video canonical/legacy fields and member/organizer API readback | PASS |
| Other four videos, language, partial-field updates and non-video-only correction | PASS |
| Foreign owner, staff, guest and forged/invalid fields | PASS |
| Duplicate request/submission and two competing submissions | PASS |
| 48 hours minus one second; exact deadline; deadline plus one second; future request timestamp | PASS |
| Approval, scored status, promotion phase, promotion history, legacy and canonical scores before/after request | PASS |
| Canonical-write and legacy-write failure rollback followed by successful retry | PASS |
| Optional schema absent/present for legacy entries; persisted rows with feature flags off | PASS |

Commands:

```text
node --test tests/five-demo-supplement-consistency.test.mjs tests/test-application-approval.test.mjs tests/practice-supplement.test.mjs
node --test tests/*.test.mjs
git diff --check
```

The final related run passed 39/39 (25 new regression cases and 14 existing cases). The complete Node suite after those additions passed 303 tests, failed 0 and skipped 1 (304 total). The existing Windows skip is `successful SQL file import with progress output still verifies actual schema and preserved rows` in `practice-provision.test.mjs`, whose POSIX `npx` fixture runs on Linux CI. The full command is exactly the test script in `package.json`; the `npm` executable is unavailable in this shell. Diff whitespace validation passed.

## Rollback and remaining acceptance

The recovery point is the existing backend file at base `dbdd5eee41a2ae4cb4a809acf8396ba54612af46`; reverting this code-only change restores the prior handler. There is no data migration to reverse. Already accepted corrections remain stored in both representations; no historical data backfill was attempted.

Real notification delivery has not been tested or claimed. Remote Cloudflare D1 execution of this exact change, a physical phone/desktop user check, independent review, the coordinating task's cloud log write/readback and production release remain separate gates. No additional UI automation was added because this fix changes no UI contract. The pre-existing availability display uses the shared legacy eligibility expression; the optional per-video score check is enforced by the write API even for unusual pending records containing out-of-band per-video scores.
