# Final-only online judging implementation plan

> Execute inline with superpowers:executing-plans; one fresh whole-branch review at the end. Existing isolated worktree reused from clean main f53e015.

Goal: implement the user's latest Muse decision. Audition, qualifier1, qualifier2 and advancement/PK judging is managed by frontline staff outside this platform. Preserve historical scores and reversible code. Final TEST scoring remains available only to invited authorized staff; official use and public voting stay pending. No real money or identity upload switch is touched.

Spec: user's2026-11-21direct instruction and latest entries in existing MASTER/AI_BRIDGE. Prior11/16paper still governs retained final scoring; this latest operational change overrides requirements to use online judging in earlier stages. No assumption of new final weights, official launch or manual advancement policy.

Architecture: a server-owned policy defaults to final_only. Explicit STAGING_ONLINE_JUDGING_MODE=all_stages_test restores old TEST behavior, only when E2E TEST is configured. Unknown values fail closed to final_only. Query parameters or payloads cannot set it. SQL reviewer queues filter final entries before attachment/serialization; score routes check actual stored phase, not body phase. Score-based January roster/promote operations are unavailable in final_only; existing application approval, contacts, registration/recycle/restore remain available. No automatic or scoreless promotion is invented.

- [x] RED: Node tests cover default filtered reviewer queue, denied January/demo/qualifier and phase-spoof writes with unchanged history, authorized final TEST score, organizer/member isolation, explicit restore mode and policy metadata.
- [x] Implement focused policy module; guard authenticated backend score/roster/promote and direct January score handler; add metadata to staff/me and organizer/reviewer queues.
- [x] UI: three-language frontline notice; final reviewer label; hide early scoring tools/stats/filters by default; default defensive final-only filtering; preserve existing workspaces and final score readback. Member Demo guidance reflects collection/frontline review.
- [x] Update legacy fixtures to explicitly opt into all_stages_test, preserving tests of recovery code. Add default-policy Edge/workerd acceptance, desktop/mobile/screenshots/role isolation and old-data counts.
- [ ] Run Node/build/privacy and relevant Playwright/full CI. No runtime migration or remote D1 write. Final review; independent PR based on current main, not dependent on draft188/189/190.
- [ ] Archive each milestone in existing Drive documents, verify readback;53formal checklist stays unchanged. No merge/brand deployment without required existing release approval.

Rollback: revert this policy commit or explicitly restore all_stages_test under controlled TEST configuration. No records are removed, so no destructive DB restore is required. Future PR188/189/190 integration must carry this newest policy forward; do not merge the earlier all-stage workbenches unchanged.

Checkpoint:5newNode policies PASS; full270tests269PASS1skip;33targetedPlaywrightPASS; old staff+default-policy Edge/workerd/D1 rehearsalsPASS. Independent whole-branch reviewer found no actionable findings. CI/PR/cloud archive are next; no live deployment yet.
