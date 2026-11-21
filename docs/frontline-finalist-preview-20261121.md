# Frontline finalist selection preview — 2026-11-21

Status: local read-only helper and regression tests verified. This module is deliberately not connected to a route, user interface, environment flag, import workflow or production gate.

## Purpose and boundary

Frontline staff manage the earlier rounds; earlier online judging remains off. `previewFrontlineFinalists(db, actor, input)` inspects an explicitly supplied paper selection, scoped only to the 2027 January registration source (`registration_round_scope: 2027-01`) for this paper preview. Each non-January record is retained in the manifest and blocked with `registration_round_conflict`, including ten TEST-approved April records with correct 5A/5B counts. This restriction does not establish policy for any future quarter. It never selects by scores, changes a phase, records a result, advances an entrant, uploads a document, publishes a list or writes an audit/database row.

Every response carries `mode: PREVIEW_ONLY`, `testOnly: true`, `mutation_allowed: false` and `qualification_established: false`. Even a response with `blocked: false` means only that this limited TEST snapshot has no listed conflicts. It establishes neither formal eligibility nor the authenticity/approval of a frontline result document.

## Input and authentication contract

The caller must supply an actor from an already authenticated, invited organizer session. This helper checks for a nonempty actor ID and organizer role; it does not authenticate a caller or validate a staff session itself. A future route must never obtain this actor from request JSON.

Input has exactly two fields:

```json
{
  "application_ids": ["01000000-0000-4000-8000-000000000001"],
  "source_reference": "frontline-paper-20261121"
}
```

- `application_ids`: 1–10 unique canonical lowercase UUID application IDs. Stage names are never lookup keys. Partial selections return a blocked preview; more than 10, empty selections, invalid IDs and duplicate IDs are rejected before database access. Duplicate ID errors identify the duplicated application ID.
- `source_reference`: an opaque internal document reference of 1–120 ASCII letters/digits, dot, underscore, colon or hyphen, beginning with a letter/digit. Contacts, email addresses, full paths, URLs and document text do not belong here. Reference validation does not prove that a document exists or has been approved.

Missing identity returns status 401, another role 403 and malformed input 422 without a database query. Structurally valid input returns status 200 with `blocked` and explicit `blocking_reasons`. Missing required schema or a read failure returns generic status 503, without SQL diagnostics or a manifest pretending that approval was checked. These status values are helper data; there is no HTTP handler yet.

## Actual schema and output

A single parameterized SELECT joins the existing `e2e_applications`, `e2e_frontline_2027_registration`, `e2e_test_application_approvals` and `e2e_registration_controls` tables. Missing control rows default to active/version 0, matching the existing administrative view. A missing controls table fails closed. Tests apply unchanged migrations 1000, 1007, 1011, 1014, 1016 and 1018; the last two optional competition schemas satisfy migration 1018's existing dependencies.

No contact, email, stage-name, affiliation, song, private-document or score column is selected. Account IDs are used internally only to detect the same entrant appearing through two application records; they are omitted from output.

The preview reports missing applications, disabled/deleted registration controls, withdrawn/rejected application status, missing existing TEST approval, missing A/B region, duplicate entrants, and total/region count conflicts. The only count rule is the supplied paper requirement: 10 selected applications, 5 in A and 5 in B. Counts describe the selected records with known regions; per-entry blockers remain blockers even when the count is correct. No category quotas, score threshold, tie policy, stage eligibility or voter policy is invented. The phase is reported for review without being changed or treated as proof of formal advancement.

The `manifest` contains a fixed version, source reference, the paper rule, `eligibility_scope: existing_test_approval_only`, sorted application IDs and whitelisted state: round, phase, status, update timestamp, A/B region, declared eligibility basis, administrative control state/version, and TEST approval state/timestamp. Missing applications have `found: false`. It also contains the ordered blocking reasons.

`fingerprint` is SHA-256 over UTF-8 `JSON.stringify(manifest)`. Application input order is normalized. Changing selected IDs, reference, relevant state or a blocking reason changes the fingerprint; scores are deliberately excluded. This unsigned content fingerprint supports later comparison and does not authenticate a result document, guarantee current freshness or authorize a write. Any future confirmation flow must re-read and compare the current snapshot.

## Verification

TDD: 21 initial cases failed with the explicit assertion that the new module was absent, after constructing the actual SQLite fixtures where applicable. A later January-source regression produced 24 passes and 1 failure because ten approved April entries incorrectly returned `blocked: false`; adding the explicit round blocker resolved that failure while preserving the January and cross-round duplicate checks. The final focused command passed 25/25:

```text
node --test tests/frontline-finalist-preview.test.mjs
```

Coverage includes ID versus identical stage names, duplicate application IDs and same-entrant records, malformed inputs, foreign roles, missing identity, missing/inactive/withdrawn/rejected/unapproved rows, missing region, 6A/4B and partial selections, deterministic ordering and stale fingerprint changes, schema failure, and score independence. Full database row snapshots remain byte-for-byte identical across previews. A separate case enables SQLite `PRAGMA query_only=ON` and confirms every application remains in its original phase.

The complete Node suite at this checkpoint passed 330 tests, failed 0 and skipped 1, 331 total:

```text
node --test --test-reporter=tap tests/*.test.mjs
```

The single existing skip is the Windows-incompatible POSIX `npx` fixture in `practice-provision.test.mjs`. No browser, external notification, remote database or physical-device acceptance was performed for this isolated helper.

## Remaining integration decisions

1. Frontline result document/import format, verified source custody, staff sign-off and formal eligibility rules remain unsettled. The supplied reference is only a reference.
2. No session-protected route, request parsing, frontend preview, audit persistence, confirmation workflow or stale-snapshot handling is wired. Future integration must retain invited-staff authentication and earlier-online-judging restrictions.
3. There is no result ledger, qualification write, admission issuance, phase promotion or publication. Those need their own approved contract and isolated remote tests; this preview does not bypass existing scoring/promotion guards.
4. Remote TEST deployment/schema readiness, independent review, root-task cloud log write/readback and a separate draft PR remain with the coordinating task. No production deployment, schema modification or live-data operation is authorized by this module.

Rollback is removal of the three new unintegrated files. No stored data or configuration needs reversal.
