# Muse change: earlier judging offline, final TEST retained

Source: user2026-11-21directly relayed Muse's latest decision, then explicitly authorized implementation. Existing MASTER/AI_BRIDGE contain that update. This overrides the operational requirement to use online scorecards for audition, qualifier1, qualifier2 and PK; original rules/history are retained. Final feature preparation still follows11/16paper, official adoption remains pending. Existing PR188/189/190 are not merged by this change.

## Implemented behavior

Server policy defaults to final_only, including unknown configuration values. Reviewer SQL queues filter to final before serializing entries, attaching photos/Demos or sending data to the browser. Score requests use the actual stored phase: a payload claiming final cannot score an audition or qualifier. January per-video scoring, score-derived January roster computation/publication and legacy three-judge promotion are unavailable. A direct private-media URL also cannot expose earlier entries to reviewers.

No scoreless or automatic advancement is invented. The organizer still manages registration, contact access, approval,48hour supplements and reversible recycling; source/historical locks remain intact. Frontline result intake/manual advancement is a separate pending workflow, not a demand that they use online judges. Existing grades, published snapshots and identities are not deleted or changed.

Invited final TEST grading retains original40/30/20/10criteria, roles, ownership controls and exact stored-value confirmation. Neither final judging nor public voting is declared officially approved. This PR does not integrate PR188/190final51/49publication or enable a new vote route.

Current backoffice and old judge-stage/organizer-stage URLs remain valid. Three-language notices explain frontline handling and final TEST status. Early score tools/statistics/score filters disappear by default; reviewers see final scorecards only. Member Demo guidance reflects collection/frontline selection. Contact data remains organizer-only and loaded on demand.

## Restoration

Setting STAGING_ONLINE_JUDGING_MODE=all_stages_test on the SERVER, together with existing E2E_TEST configuration, restores the old controlled TEST judging. No URL parameter, submitted phase or browser input can enable it. Tests of legacy functionality explicitly use this restoration setting; the new default-policy tests do not. Future integration of PR188/189/190must adopt this latest policy rather than reopening earlier scorecards accidentally. The separate historical private-practice fictional lab is retained as a development tool, not the real E2E judging workflow.

## Evidence

New5Node tests check SQL filtering, organizer/member separation, denial of all earlier writes/phase spoofing, unchanged historical counts, explicit restoration and private media. Full local suite270total /269PASS /1existing Windows skip. Targeted33Playwright tests PASS, including3new current-policy cases; broader CI still to be recorded separately.

Actual Microsoft Edge + disposable local Cloudflare workerd/D1, default final_only:20fictional entrants,54Demo rows,1historical audition score and1historical qualifier score unchanged. Reviewer sees only1final entrant; organizer sees all20. Two final TEST scorecards stored and read back as38/28/16/9, including mobile committed-response-loss recovery. Desktop/mobile screenshots,280/320/360/375/390/412/430/480/768/1440px and three-language notices checked. Existing staff/contact/recycle/legacy scoring Edge/workerd regression also PASS under explicit restoration.

All databases here are disposable local fixtures. No remote migration, actual data deletion, formal vote/payment switch or real-person document upload. Physical phones, live OTP/Turnstile and remote TEST acceptance are separate. Production-facing merge/deployment is pending the existing release-approval requirement; current code rollback point is main f53e015547b34096c3e7c86f9e727df18e252c90.

Rollback: revert only this policy commit or explicitly restore the authorized legacy TEST setting; no database restoration is needed because records/schema are untouched. Review current runtime mode on deployment, because an explicit restoration variable must not remain enabled on the brand TEST site. Formal53checklist unchanged.
