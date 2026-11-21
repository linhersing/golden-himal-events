# Frontline rules and current implementation gap audit

Source: original 11/16 internal Word in Drive (1mk0XnqY4si3Yu5q69DnAy7x3t8mkQ_ZT); source folder has no newer rules. MASTER section172/173 contains questions/suggestions, not answers changing the rules. Latest actual Muse/Alan LINE quotations are11/18; Issue176 records payment ON HOLD. The former September final, university/community awards and25/8 quotas are obsolete for this cycle.

| Stage | Confirmed rule | Current brand implementation | New engine scope |
|---|---|---|---|
| Jan1–31 audition |1–5 videos60–90s,3–5 judges60/40; highest video mean, one seat per person |1014/1016 and january-demo-test.js score/snapshot; no next-stage eligibility bridge |stage-local best-video and regional selection calculations |
| Feb12 qualifier1 |individuals, A/B separately,40/30/20/10 average; quotas pending |only legacy qualifier field; cannot distinguish three live rounds |independent qualifier_one identity, exact mean and criteria ties |
| Mar5 qualifier2 |individual or team unit; SUM of authorized judges; whole team advances,10persons per region |no teams/units or team-level scores |qualifier_two, people-count quota, team and unequal-coverage blockers |
| Mar12 regional PK |10individuals/region→5pairs→5winners; mean then criteria then named jury ballot |no pairs or PK stage |pair calculation and20→10 validation; pending named ballots block |
| MidMar–midApr training |optional; no grades; nonattendance never cancels qualification |no enrollment model |separate enrollment transform, no score field |
| Apr14 final |10finalists, single group; valid votes/max*100,0if no votes;51/49;2decimal final; ties judge mean then named ballot |old standings split legacy categories; old test-vote account-only and paid gate |unified exact final arithmetic from an already-validated vote snapshot |

All dates are provisional and Nepal local time. Source second-qualifier SUM is retained: the11/17 proposal to change it to average has no actual approval in retrieved sources. Unequal effective panels must not silently produce comparable SUM totals.

## Preserve and do not reuse blindly

- migration1000 stores only demo/qualifier/final; e2e_live_scores primary key includes that old stage. Reusing qualifier would collide or conflate scores. Old25/8 category quotas and simulated_paid gates do not represent2027 rules.
- January roster freezes scores and records selected IDs; organizer-promote rejects this route. A reviewed bridge into qualifier1 is still needed.
- migration1018 audit action enum covers registration management only. New stage actions need their own append-only audit. Protection triggers know old scores only: new storage must add RESTRICT preservation and inactive-registration write guards.
- Existing final private-practice tiebreaks compare extra criteria after judge mean, unlike the latest final rule. Do not import that fallback.
- PR150 is a disabled/unrouted voting-security core. It is not public voting: no issuer, complete UI, anomaly/invalidation workflow or frozen final results. Review before integration; never treat Email OTP alone as one natural person.

## Not yet implemented by the rules-engine PR

The pure functions do not write D1, change eligibility, publish results, issue voter credentials, accept votes, launch public support/likes, notify contestants or add a stage selector to the live backoffice. They have no payment dependencies and do not modify existing registrations, URLs, demo scores or stages. Source and engine tests are the first independently reviewable slice, followed by the authenticated additive storage/workbench and isolated voting lifecycle described in the plan.

## Pending frontline decisions / launch gates

First qualifier and audition quotas/reserves; maximum team members and boundary-overflow resolution; approved PK pairing and replacements; exact voting window, identity proof and per-person limits; finalist video readiness and publication consent; named panel decision procedure; formal staff/mobile UAT and restoration proof. Missing settings block affected publication, while independent scoring previews remain possible. Tie IDs used for deterministic display never settle a sporting tie.

## Financial decision

Muse11/18 12:34–35: QR is for registration, currently not payment; no fees on the public website, discuss later in person. Alan14:50–51 confirms no website collection now. No payment/vendor/merchant implementation or application should proceed; old internal fees remain historical/pending, not canceled by this decision. Public awards are not registration fees.

## Evidence and record continuity

PR185/186 public signup and PR187 recycle release, D1 before/after counts, Time Travel points, limitations and evidence archives were found in both existing master documents. This audit does not invent missed work or duplicate the formal53 tracker. New source/gap/testing/PR/deployment states must continue in MASTER and AI_BRIDGE; no formal completion boxes are checked by this source/rules review.
