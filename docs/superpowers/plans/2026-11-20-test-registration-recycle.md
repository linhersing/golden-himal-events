# TEST registration recycling implementation plan

> For agentic workers: use superpowers:executing-plans to implement task by task.

Goal: authorized organizers can remove an individual or all eligible TEST registrations from the working roster, inspect the recycle area and restore a batch without losing original entries, videos, scores or audit history.

Architecture: extend existing versioned soft-delete/restore transactions. Persist a bounded immutable candidate snapshot in the existing append-only audit table, bound to the organizer. Apply in small chunks with deterministic audit IDs; replay reads prior results. Recheck current protection and optimistic versions in the existing D1 transaction. New registrations are excluded from the frozen snapshot. No new schema or physical DELETE statements.

Tech stack: existing vanilla JS three-language workspaces, Cloudflare Worker and D1, node:sqlite, Playwright/Edge and disposable workerd.

Design decisions: preserve the prior explicit requirement that scored/promoted entries cannot be changed or deleted. A bulk action processes only eligible entries and reports skipped protected rows. Recoverable recycling fits the requirement; permanent deletion and an unrestricted database reset would violate existing history protections. Actual cleanup of the current three records is not part of adding the feature.

Constraints: existing official URLs, OTP/Turnstile, roles, 5 demos, historical scores, contact isolation, audit masking and finance/upload/vote restrictions remain intact. Use the already isolated clean workspace, branch codex/test-registration-recycle-20261120, base 838b55f6. Do not touch other worktrees or uncommitted files. No remote data mutation during acceptance; trusted code deployment must preserve D1 counts and obtain a restoration point.

## Deliverables

- [ ] Backend: organizer-only POST bulk preview/apply/status/recent/restore-preview API; TEST-only guard, actor-bound expiring snapshot, max 500 candidates and at most 10 records per apply chunk. Empty and protected cases explicit. Per-record masked audit and verification; no duplicate side effects; interrupted outcomes inspectable after reload.
- [ ] UI: clear single-record recycle/restore entry points plus a separate bulk view inside the existing management workspace, not an expanding roster. Counts, protected exclusions, typed confirmation, in-flight state, read-only result check, continuation after verification, recent batches and batch restoration. Clear stale content on logout/role switch. Three languages and at least 48px touch controls.
- [ ] Tests first: roles/origin/feature gates, stale plans, targets added or scored after preview, replay after restore, chunk/limit bounds, audit failure/rollback, unknown result/read-only verification, batch restoration, score and demo preservation. Real-handler browser mobile/desktop and disposable workerd D1 readback with fictional entries only.
- [ ] Verification: full Node/build/privacy/browser CI, independent review, draft PR, screenshots and evidence. Brand TEST code release only after checks/review; never press bulk cleanup on existing records. Verify deployed SHA, pre/post D1 counts and restoration bookmark. Append each milestone to existing Drive records; formal 53 checklist unchanged.

Rollback: revert the code deployment, retain new append-only audit events and registration controls. Restore recycled records through the existing or new guarded restore path. Do not restore the whole database without reconciling later registrations and scores.
