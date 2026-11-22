# Frontline offline selection → independent final TEST handoff

## Decision and scope

Muse's current direction is offline frontline judging for the audition, two qualifiers and regional advancement. The user's idea that the frontline may simply hand over a final roster is recorded as a proposal, not a confirmed final operating policy. Codex implements that conservative handover as an isolated fictional TEST; it does not require entering earlier online scorecards or invent a cumulative scoring rule.

Invited organizer → select applications by ID → preview ten people and source reference → acknowledge fictional TEST → atomic handoff receipt → independent final grading and ballot draft. The existing paper's January source, ten finalists, five in AreaA/five in AreaB are checked. Original names can coincide; selection keys remain full IDs. Source reference is an opaque internal document code, not verified custody of a paper result. No real documents are uploaded.

The UI does not accept arbitrary earlier numeric scores: different stages may use different paper procedures, and no approved platform aggregation rule exists. If frontline needs digital archival of those marks later, add a separate per-stage result ledger with provenance and correction history; do not treat paper marks as final grades automatically.

## Code and dependencies

Stacked on PR193's isolated staff OTP bridge and PR190/189/188's isolated final ledger; incorporates PR197's read-only preview. PR193/197 are not blindly declared deployed by this change. The new API `/api/frontline-handoff-test`,1022 migration and fixture UI are reachable only through `backend/stage-test-worker.js`, never the brand Worker. Explicit `STAGING_STAGE_REHEARSAL_ENABLED=true`, fictional scope and `STAGING_FRONTLINE_HANDOFF_ENABLED=true` are required. New handoff UI is shown only to an authenticated invited organizer when available. Main brand provisioning/configuration, public signup, CAPTCHA, actual applications/phases/scores and original URLs are unchanged.

Apply1020,1021,1022 only to a newly verified empty disposable isolated TEST D1. Require real project authentication, dedicated bindings and authorized hostname before any remote rehearsal. Local fixtures use a new temporary D1; no existing/shared database was migrated, deleted or restored.

## Safeguards

- Same invited staff session/cookie authority; no header or submitted role can grant access. Member/reviewer/guest cannot read source roster or confirm. Reviewers receive final performance information, not source manifest or contacts.
- Compact paginated candidates and on-demand preview, without contacts or background information. Each read appends an immutable minimal stage audit; successful confirm includes operator/time/source/fingerprint/count and no private content.
- Selected source rows, statuses, approval, registration controls and monotonic timestamps are compared again inside the D1 batch. Duplicate identities and regional/count mismatches block. Final panel must be three to five distinct existing reviewers.
- Target final must be empty/locked at the expected version; existing final units/scores or initialized ballots block. One immutable handoff per final; no replace/delete endpoint.
- New final seats, audit and receipt commit atomically; original applications are not advanced or rewritten. Final scores start empty. No old simulated payment gate is required.
- Idempotent request ID and canonical request hash; exact replay returns the original receipt, conflicting replay fails. UI disables duplicate submission. Definitive4xx restores editing; uncertain network/5xx outcomes preserve the same request in page memory until receipt lookup. Lookup is read-only; absent receipt allows explicit same-request retry. Reload reads the existing organizer-only receipt.
- No localStorage/IndexedDB or credential/PII persistence; no new external requests. Existing live Turnstile/OTP is not weakened or bypassed.

## Evidence

Baseline365Node:364PASS/0FAIL/1existing Windows-only skip. New24SQLite tests observed missing-feature RED, then24PASS. Full current Node389:388PASS/0FAIL/1existing Windows skip. Build and source/dist privacy scans PASS. Full Linux and broader Edge evidence will be added after CI; no unrun result is asserted here.

Actual isolated Cloudflare workerd/D1 plus Microsoft Edge:20fictional applications/54Demos; mock external mail/Siteverify only, browser starts with zero cookies and obtains its session through the actual OTP/server-cookie protocol. Organizer selects ten source IDs, previews, recovers from stale-source409 to editing, handles prewrite failure → null receipt → explicit identical retry → committed response lost → receipt confirmation → reload. Ten final seats created with zero final scores, then one independent final grade37/28/17/8 is stored and read back; ballot initialization creates ten candidates in draft, hidden from guest. This does not claim all30new final grades or real public voting were exercised by this new script; existing broader final lifecycle tests cover separate fictional scenarios.

Viewport280/320/360/375/390/412/430/480/768/1440, three locales, landscape and root text200% pass without overflow. These are emulations, not physical-phone acceptance. Original application/Demo/legacy-grade/contact rows stay unchanged by handoff. The stale-source test deliberately changes one fixture timestamp twice; preservation comparison is reset after those explicit test mutations, respecting the existing monotonic update trigger.

Fifteen isolated stage/vote/handoff tables are backed up to fictional-handoff-backup.json and restored into a second independently created empty target. Per-tableSHA256 and organizer-authenticated restored receipt readback match. This is not production TimeTravel proof or a full backup of existing brand personal data.

Independent review found two workflow defects (stale409 trapped pending; missing full roster on review). Both reproduced and fixed; reviewer reran24tests and found no remaining blockers. The suggested prewrite/null-receipt retry browser case was also added and passed. A later browser test initially inspected stale hidden review controls before the response finished; corrected to wait for visible review and enabled acknowledgement, without force-clicks or weakening assertions.

## Deployment limits and rollback

Not merged or deployed to goldenhimalpalace.com. No new live SHA or remotely accessible test URL is claimed. No official voting/payment/real-document switch is enabled. Real mail/Turnstile, dedicated remote Worker/D1, physical Android/iPhone, paper-result custody/eligibility/consent, nominees/corrections/reserves and formal voter identity/window/limits/tie/abuse policy remain unaccepted. Formal53 is unchanged.

Rollback before deployment is dropping this draft branch from integration. For an authorized isolated deployment, disable only its new handoff flag/entrypoint and retain immutable audit/handoff/score/ballot data. Never restore a whole shared database over subsequent registrations. Correcting a confirmed real roster needs a separately reviewed audited supersession workflow; no destructive shortcut is offered here.
