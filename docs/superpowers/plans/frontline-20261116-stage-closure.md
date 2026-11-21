# Frontline 2027 stage closure implementation plan

> Use superpowers:executing-plans task by task. Existing isolated worktree is reused on a new branch; other worktrees and uncommitted work remain intact.

Goal: represent audition, qualifier one, qualifier two, regional PK and final as independent scored stages, and optional training outside competition scores. Deliver separately reviewable rules, authenticated storage/workbench and final-vote rehearsal changes. Do not rewrite legacy phases or history.

Sources: original 11/16 Word (Drive 1mk0XnqY4si3Yu5q69DnAy7x3t8mkQ_ZT), latest MASTER and AI_BRIDGE, 53-checklist, 11/18 Muse12:34–35/Alan14:50–51 LINE quotations and Issue176. Source precedence: latest actual frontline decisions over old rules, actual rule text over AI questions or proposed changes. No newer rule file was found in the SSOT folder. Original dates remain provisional, Nepal local time.

## Design decisions

1. Preserve old demo/qualifier/final tables and their existing tests. Reusing qualifier for three live stages loses identity and collides with score primary keys; extending that enum in place risks triggers, mock-payment gates and protected history. New stage identifiers and additive isolated TEST storage are preferred.
2. Three PR slices: (A) executable rules engine and gap/source audit; (B) additive stage instances/panels/units/immutable scores/results/advancement/training, existing staff authorization, separate masked audit and mobile workbench; (C) isolated final ballot lifecycle, PR150 security review, anomaly/invalidation/frozen51–49 tally and public-style rehearsal. Public voting and payment remain OFF. Each slice reports what actually works rather than treating foundations as a finished public launch.
3. Stage points never carry forward. Audition uses each video's mean then the best video; first qualifier uses regional mean; second qualifier ranks whole units by SUM, with all team members advancing; PK compares paired regional individuals. Live criteria40/30/20/10, audition60/40, assigned3–5 judges. Training carries no score and never alters eligibility.
4. Final is one combined group of10, valid votes/max*100 (allzero=>0),51/49, final total rounded half-up to2dp. Final tie: judge mean, then a named panel decision, not old technique/category fallback.
5. No presumed first-round quota, team cap/overflow policy, pairing method, voting dates/identity/limit, or official approval. Missing decisions block affected publication. Scoring previews may still work. Do not change SUM to mean simply because it seems fairer; differing effective panel coverage blocks a SUM ranking pending an explicit decision.

## Tasks

- [x] A1 Rules engine tests first: stage independence, mean-vs-sum,5Demo best mean,3–5 panel coverage/recusal, teams/region/dedup, quota overflow, PK pairing/ties, final unified group/zero votes/rounding/tie, training no effect.
- [x] A2 Implement focused pure module backend/frontline-stage-rules.js, source/gap audit with exact code references and release gates. Node and existing regressions; independent review; draft PR.
- [x] B1 Design additive schema with RESTRICT relationships to applications, stage/unit membership, assigned panels, unique scores, event/idempotency keys, immutable results and masked append-only audit. New writes must honor deleted/disabled/withdrawn registrations. Backup/restore rehearsal before D1 migration; no existing remote database mutation.
- [ ] B2 Existing staff-session/origin/Turnstile/roles stay authoritative. Versioned atomic stage-score/result/advance APIs; reviewer only assigned work and own scores; no contact export, no unsafe local storage. Explicit January snapshot eligibility bridge.
- [x] B3 Stage-filtered mobile workbench, one unit/song at a time, exact score readback/unknown outcome protection. Optional training enrollment separate.20fictional entrants, desktop/mobile and disposable workerd/D1 evidence.
- [ ] C1 Review PR150, implement isolated ballot state/window/eligibility/uniqueness/audit/invalidation/freeze, ten finalist bios with random non-ranking IDs, own vote receipt, no PII, zh/en/ne. Never make one Email imply one person.
- [ ] C2 Snapshot valid ballots and final judge scores consistently;51/49 and named panel ties; realistic bounded isolated load/retry/closure tests. Voter policy unknown remains a launch blocker.
- [ ] Archive each checkpoint in existing Drive MASTER/AI_BRIDGE/general history; distinguish code/tests/localworkerd/remoteTEST/live/physicalphone. Formal53 checklist not checked early.

Rollback: revert only the affected code slice. New schema is additive and should remain for history; freeze new actions instead of destroying rows. Do not restore the whole database over later entries. Existing stage table exports and copied restoration points must be validated before any remote migration; public finance, voting and real identity document gates remain closed.

Checkpoint: A is draft PR188 with CI green. B local implementation and20entrant Edge/workerd/restore rehearsal pass; B2 remains partial because real frozen-January eligibility import has not been integrated. No remote deployment or physical-phone acceptance; see docs/stage-ledger-isolated-acceptance.md.

C checkpoint: independent fictional ballot lifecycle, workbench,8security/transaction tests and Edge/workerd14table restore pass. C1/C2 remain partial for real media/identity policy, named-panel resolution, remote capacity/deployment and physical devices. See docs/final-vote-isolated-acceptance.md.
