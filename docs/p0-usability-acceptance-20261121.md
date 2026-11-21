# P0 verification and current rules usability — 2026-11-21

Base: dbdd5eee41a2ae4cb4a809acf8396ba54612af46. This is a reversible
no-schema change. Existing member/staff auth, registration and final-only policy
remain in place. The user requested continued implementation and P0 verification.

## Actual defects addressed

- Password onboarding used `turnstile.ready()` for an asynchronously loaded script,
  which rejects that mode. Render now starts from the script load event, using the
  same challenge action/token and unchanged server verification.
- CF110200/domain/key configuration failures were reported as visitor-side blocked
  scripts. Public numeric codes now select accurate translated recovery messages.
  Challenge failure remains retryable. A previous solved token is always cleared.
- Rules deep links were initialized below an early `return` for the news page.
  Initialize the existing disclosure navigation first, including same-hash taps;
  malformed hashes do not crash the page. No registration auth starts on news.
- The printable brief still showed superseded two-group/18+ eligibility, an April
  repeat audition, September32finalists and old prizes. It now follows the
  November16 paper: single group, A Lumbini/B Bagmati, planned Jan–Feb12–Mar5–
  Mar12–Apr14 stages, ten finalists and NPR415000 total. No public fee is added.
- Readiness inspected an obsolete isolated hostname; it now inspects the main
  domain read-only. Replace outdated preview/no-DB checklist assertions with P0
  release evidence requirements, without checking formal53 items.

## Coverage and evidence

Five new browser cases first failed (2 old tests passed). After the fixes, seven
Turnstile UI tests passed, including member/staff domain/challenge failures,
three-language changes, invalidating a previously solved token and async password
rendering. Pure classifier tests reject malformed/nonpublic code reflection.

The prior17 extra-suite failures were examined individually: some were obsolete
expectations, others exposed the two rules/print defects above. Meaningful logo,
image loading/proportion, navigation, translated content, privacy and mobile
geometry assertions remain. Public pages must not regain old sample-save,
fake-vote or D1-write controls just to satisfy superseded tests.

Local all-spec Edge run: **194/194 passed**. An additional focused seven-case run
checks the final translated status/screenshot changes. Independent review found
no blockers; its focused Node coverage across this work and disjoint prepared
changes passed69/69. Exact isolated PR Node and CI totals belong to GitHub's run,
not the mixed development-worktree count.

The CI runtime entry also discovers specs absent from the initial workflow list
and runs each missing spec once. Its separate Playwright output directory
preserves earlier screenshots and workerd/D1 evidence.

## Release limits and rollback

Synthetic challenge callbacks/provider responses are not real human/OTP acceptance.
Do not modify sitekeys, disable Turnstile, seed a live session, send real test
registrations or enable money/voting/real-document uploads for this fix. Existing
primary URLs and data are preserved. Follow trusted Workers Build, fresh D1
restore/preservation proof and deployed-SHA checks. Code revert and redeploy is
the rollback; never remove newer entries or restore a whole database for this
frontend change. Append actual release status/evidence to existing Drive records.
