# TEST registration recycling acceptance — 2026-11-20

Scope: organizer-only single and bulk reversible recycling, restoration, database readback and audit. Source baseline 838b55f6 (PR #186). No actual cleanup of the brand site's existing applications is authorized by this feature implementation.

## Implemented

- Existing single-record edit/disable/recycle/restore remains; opening management details now loads the current server version. Management search is invalidated after changes, including on Back.
- Separate bulk workspace, preview counts, protected exclusions, typed DELETE TEST / RESTORE TEST confirmation, processing lock, database result checks, explicit continuation, recent batches and batch restoration.
- Actor-bound immutable plan in append-only existing audit, 10-minute apply expiry, 500-record maximum, 10-record chunks, stable per-target audit IDs. New entrants excluded, concurrent edits/scores/promotions rechecked transactionally. Replays after restoration cannot delete again.
- No physical deletion, schema migration, unsafe client storage, private contact export or permission expansion. Existing score/promotion protections and formal payment/upload/vote gates unchanged.
- Chinese, English and Nepali controls. 48px minimum buttons; compact two-column counts.

## Verified locally

- Node: 265 tests, 264 PASS, 1 existing Windows skip, 0 FAIL.
- Focused desktop/mobile organizer browser regression: 7 PASS, 0 FAIL.
- Source and built privacy scans: 0 findings; build and git diff --check PASS.
- Actual Edge + disposable local Cloudflare workerd/D1: PASS. Twenty fictional entrants, 1/3/5 videos; legacy reviewer workspaces and score recovery remain operational.
- Recycle/restore both desktop1440 and mobile390: 17 eligible removed, 3 protected retained. Before/after counts 20 applications, 54 videos, 2 per-video scores, 0 legacy scores. All physical records preserved; actual database state read back after each action.
- Mobile post-commit response loss: UI reports unknown, no blind automatic retries; reload recovers the server-persisted batch, verifies committed10, explicitly continues7, restores17. Returning to management reloads the active list of3 protected entries.
- Widths280/320/360/375/390/412/430/480/768/1440 checked without horizontal overflow; 200% root font and three-language switching verified. These are browser viewport tests, not physical handset certification.
- Independent read-only review: stale management cache P2 found and fixed; no unresolved blocker. Additional 504-record probe confirmed500 planned,2 protected,2 remaining and full500 restoration.

## Additional broad run — not a complete pass

A locally expanded 186-test run reported165 PASS /21 FAIL. Two affected management mock tests did not support ID lookup; their mock now matches the real API and the focused7 passed. Other failures include legacy branding/rules expectations outside the current CI selection, plus navigation failures during asset rebuild. They have NOT all been individually baseline-reproduced or revalidated. Do not present this as an all-site formal acceptance pass. The repository's selected browser CI and new disposable-runtime checks must be green before release.

## Remote status / limits

Draft PR and CI to be linked after creation. No remote D1 data mutation or brand-site deployment performed in this change at this checkpoint. Existing Edge window is minimized and unavailable through the current native UI tool; user was asked to restore it while development continues. Cloudflare remote TEST pre/post counts and current restoration point remain a release gate. No physical phones tested. Formal53 acceptance checklist unchanged.

## Recovery

Code rollback: revert this PR/deployment to the previous verified TEST SHA. Data recovery: organizer restores the individual or exact affected batch through the guarded API; keep application, work, score, account and append-only audit rows. Do not restore the entire D1 database without reconciling registrations and scores written later. More than500 eligible entries requires another explicitly previewed batch. Protected records intentionally remain and are not a database reset.
