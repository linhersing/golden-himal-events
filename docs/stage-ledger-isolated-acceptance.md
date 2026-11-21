# Independent stage ledger rehearsal (draft, not brand integration)

Depends on PR188 / 00ecb000f4900918a37d4be76b00147e893c9d2e. This slice adds a dedicated Worker and fixture workbench; it does not merge, deploy or add a route to goldenhimalpalace.com. Original member/backoffice links, grades, registration data and payment/vote gates are unchanged.

## Actual behavior

- New stage instances identify audition, qualifier one, qualifier two, regional PK and final independently. Immutable unique stage/unit/performance/judge scores, atomic audit receipts and CAS stage freeze establish next-stage eligibility without copying grades. Optional training has its own table and never removes finalists.
- Reuses existing invited staff sessions, account identity and role-scoped ownership. Ordinary members/anonymous requests are rejected. Reviewers receive only their own scores and no private contact fields; organizer-only configuration/training/results are checked on the server. Judges cannot score themselves or a team containing their role-scoped member identity.
- Fictional test quotas/team caps and explicit PK pairs are labelled TEST scenarios, not decisions on missing frontline policy. Whole-team quota overflow, incomplete panel, unapproved quotas and sporting ties block advancement. Final publication is deliberately blocked until the voting lifecycle is accepted.
- Three-language fixture workbench gives six compact rows per page, search, stage/entrant/performance navigation, browser Back, memory-only unfinished inputs, duplicate-submit prevention and exact stored-value confirmation. Unknown outcomes require a readback. Training retries keep the original request ID and preserve the selected finalist.

## Local acceptance evidence

Command: `node scripts/stage-ledger-isolated-test.mjs <wrangler-tools-directory> <evidence-directory>`.

Disposable local Cloudflare workerd/D1 and real headless Microsoft Edge:20fictional entrants,1/3/5Demo positions,three invited judges, qualifier-two solo/team units,20PK entrants/10pairs,10finalists. Stored scores by stage:168/60/54/60/30. Original20applications,54Demo rows and0legacy live-score rows remain unchanged.385new masked audit events (final evidence is authoritative).

Desktop1440 and mobile390 screenshots: stage-roster, stage-score, stage-saved; training-confirmed-mobile. Overflow checked at280/320/360/375/390/412/430/480/768/1440px and200%text. English/Nepali boundary text checked. Mobile score committed-but-response-lost recovery and training committed/failed-write cases confirmed through D1 reads; safe retry preserves request ID. A browser viewport is not physical Android/iPhone acceptance.

All seven new stage tables were exported from the disposable fixture, restored into a second empty disposable fixture and compared using canonical SHA256 per table. The restored authenticated API returned all10finalists. This is an actual local restore rehearsal, not a remote Time Travel point. No remote D1 was migrated.

## Safe deployment and restoration gates

1020_stage_ledger_ISOLATED_TEST_ONLY.sql is intentionally absent from brand build/provision configuration. The new entrypoint requires an explicit TEST flag, dedicated E2E_DB and fictional-scope marker, and rejects the brand hostname. Assets live under tests/fixtures, outside public/dist. A future remote rehearsal must use a separately named `ghv-stage-test-*` Worker and newly created disposable D1. Never bind E2E_DB or legacy production DB to it; copy only reviewed schema and fictional seed data.

Before any remote migration: inspect bindings/account and empty-target counts; save config/version and Time Travel bookmark/export, verify restore target and approved maintenance plan. Existing databases require a separate reviewed January-roster eligibility bridge, active-registration reconciliation, role/data/privacy UAT and explicit approval. No whole-database restoration over later registrations. Rollback new code or disable its dedicated flag; preserve immutable score/audit history. Delete only a verified disposable rehearsal resource under its explicit cleanup authorization.

## Outstanding / not accepted

No Cloudflare remote deployment, physical handsets, actual January frozen-roster import, named panel ballot workflow, recusal/replacement-panel procedure, live performance metadata intake or formal voting launch in this PR. Source-pending audition/qualifier-one quotas, team cap/overflow and actual PK pairing decisions remain launch blockers. Final51/49 arithmetic is in PR188 but trusted ballot issuance/verification/invalidation/closing/freezing belongs to the next independent slice. Official payments remain ON HOLD. The53formal checklist is unchanged.
