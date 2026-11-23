# Golden Himal Voice release acceptance

As of 2026-11-21. Primary website: https://goldenhimalpalace.com/ . Existing TEST
registration uses real email and D1. Earlier static-preview checkmarks are no
longer evidence for this runtime. Read existing Drive MASTER and AI_BRIDGE for
the latest frontline paper and Muse/Alan decisions before a release.

## Non-negotiable acceptance rule — approved 2026-11-22

For **every** change to the canonical member, registration, or staff flows, do not
claim that the site is ready unless all applicable checks below pass on
https://goldenhimalpalace.com/ (not an old Workers preview). This rule supersedes
older single-role, static-page, synthetic-OTP, or CI-only success claims.

- [ ] Real Cloudflare human verification works for members and invited staff.
  A legitimate six-digit OTP email **arrives** and is accepted within its
  permitted lifetime. Failed/expired challenges show accurate localized
  recovery text. Never bypass Turnstile, OTP, role isolation, or rate limits.
- [ ] **Chinese (zh-Hant), English, and Nepali** each permit real text entry after
  successful sign-in: nine authorized private contact/education fields,
  performance name, song and video details, mobile keyboard and desktop,
  including non-invited public members. Switching languages does not erase
  entered text or accidentally disable authorized fields. Negative cases
  must keep unauthorized private fields locked.
- [ ] Actual submit returns an identifiable confirmation and application ID;
  re-login/refresh yields the **same saved values** from Cloudflare D1. Unknown
  results must not be mistaken for success or cause duplicate submissions.
- [ ] The **organizer backoffice** can read that submission's authorized
  complete information; a **separate organizer submission-notification email**
  is actually received in the approved recipient inbox and references the
  correct application ID/backoffice route. Do not confuse participant OTP
  delivery with organizer notification, or API "accepted" with inbox receipt.
  Sensitive contact/address/ID contents belong in the access-controlled
  backoffice, not in a plain notification email without separately approved
  privacy/security policy.
- [ ] Record three-language desktop and **physical** phone device outcomes,
  non-invited/invited member variants, organizer and reviewer role isolation,
  deployed SHA, Cloudflare version, receipt/ID, and redacted inbox/D1 readback
  evidence. A synthetic browser run alone is not frontline UAT.

If any element is unimplemented, fails, or lacks live evidence, report
**PARTIAL / BLOCKED / FAIL** with exact gap; do not declare end-to-end PASS.
This is an acceptance requirement, **not** a claim that the backoffice mail
notification already exists. Keep official payment, public voting, and real
identity-document uploads off until separately authorized.

## Four-gate release protocol — 2026-11-23 quality freeze

A 100% guarantee against all future incidents is impossible. Instead, use
a documented **GO / NO-GO** decision for the *approved registration TEST scope*.
Do not mistake a PR's CI success for live delivery and never turn off anti-abuse
verification to make the test pass.

**Gate 1 — Engineering candidate (developer)**
- [ ] Freeze non-critical feature development for this candidate. Explicitly
  list in-scope member registration, OTP, D1, approved staff backoffice,
  multilingual demo-link intake, organizer notifications and privacy boundaries.
  Keep final public voting, real payment and raw identity-document uploads OFF.
- [ ] Review current default branch and conflicting/open stacked PRs. Verify
  release candidate SHA and all required CI/Playwright/workerd/D1/privacy checks
  are green on **that exact SHA**, not an older one.
- [ ] Confirm a server-side organizer submission-notification implementation
  actually exists; if missing, treat it as a **release blocker**, not something
  to solve through frontend success text. Do not expose full applicant PII
  in ordinary mail.
- [ ] Before deployment, create and verify D1 Time Travel / backups and
  preservation counts. Record a trustworthy rollback procedure; do not
  overwrite newer submissions by restoring an entire old database.

**Gate 2 — Deployed site smoke test (technical release owner)**
- [ ] Deploy the reviewed SHA via the existing trusted pipeline and verify
  https://goldenhimalpalace.com/practice-build.json and Cloudflare active
  revision match it; then smoke-test /member and /backoffice.html.
- [ ] Compare before/after counts for accounts, applications, 1–5 demo links,
  staff roles, votes/scores and audit events. Confirm paid/vote/ID switches OFF.
- [ ] On deployed site, check Turnstile real domain/action; do not use mock
  tokens, expose secrets or log personal OTP codes.

**Gate 3 — Frontline real-user acceptance (Muse / Alan / Tang teacher)**
- [ ] Complete **3 languages x 2 device classes** (zh-Hant, en, ne x laptop
  and physical Android/iPhone), using approved TEST identities: actual human
  challenge, legitimate received OTP, login, nine authorized fields, song and
  1 demo video link, submit receipt/application ID, refresh/relogin D1 readback.
  Test language switching without losing typed data. Verify 1/3/5 demo counts
  where enabled on approved TEST state, without changing shared real entries.
- [ ] Use an **independently invited** organizer mailbox for staff OTP, staff
  login and exact application-ID backoffice lookup. Reviewer permission is
  checked separately; ordinary members must remain excluded from staff data.
- [ ] Check the participant OTP, organizer staff OTP and **distinct organizer
  new-application notice** in their real receiving mailboxes. Provider accepted
  / HTTP 200 is not inbox delivery. Record anonymized delivery proof.
- [ ] Test one invalid/expired OTP, one failed Turnstile, one duplicate or
  interrupted submit, one inaccessible Drive/YouTube link, and staff session
  expiry. Confirm intelligible errors, no unauthorized access and no duplicate
  records. Never share passwords, real OTPs, identity documents or test-user
  private details in screenshots/chat.
- [ ] For each scenario record language, OS/browser, device, local time, URL,
  numbered actions, expected/actual, redacted screenshot, application ID and
  PASS/FAIL/BLOCKED. A failed case must be fixed and re-tested on the **new
  deployed SHA**. Third-party video playback must not require a login.

**Gate 4 — Approval and operating readiness (project owner)**
- [ ] All critical paths and security/PII checks PASS with evidence, **zero
  unresolved P0/P1 defects** in this release scope; no hidden blocked or
  untested mandatory rows. Cosmetic P2 may be deferred with owner and date.
- [ ] Name a frontline tester, technical incident owner and organizer sign-off
  owner; prepare rollback, alert/log investigation and support contact.
- [ ] Obtain explicit organizer/王老師 GO for approved scope, date, version
  and audience. Start with limited controlled testing and verify production
  monitoring before any larger campaign. No automatic launch just because
  the calendar reaches early December.
- [ ] Report **NOT READY** if any mandatory real delivery or UAT evidence
  remains missing. Keep milestone percentages separate from scenario pass
  rates and deployed feature coverage; only mark formal 53-item checkpoints
  when their actual own criteria are met.

## P0 release gates — attach evidence for every relevant change

- [ ] Confirm current main/PR dependencies; preserve other work and record reviewed SHA.
- [ ] Run member/staff server Turnstile, OTP, session and role regressions. No test-key/auth bypass on the shared website.
- [ ] Non-invited public and password members can type nine private fields and submit1/3/5Demo TEST entries; verify actual D1 readback.
- [ ] Staff remain invited. Member/reviewer cannot read organizer private contacts or change another member's application.
- [ ] Approved/scored/promoted records stay locked; preserve all grades and URLs.
- [ ] Challenge expiry/failure/timeout cannot reuse old tokens or claim false success.
- [ ] Check phone widths, desktop and three languages. Separate viewport simulations from physical Android/iPhone acceptance.
- [ ] Required CI, privacy scans and workerd/D1 tests pass. List extra failures; never describe a partial run as all green.
- [ ] Before a shared D1 operation, record backup/TimeTravel and preservation counts; after release verify deployed SHA/readback.
- [ ] Check the primary-domain member/staff entry after deployment. HTTP200/capability flags do not prove human verification or email delivery.
- [ ] Record real human challenge, inbox/login and physical phone acceptance when performed. Unperformed steps stay unaccepted; never mark formal53 without evidence.
- [ ] Append results, deployment/rollback and pending issues to existing MASTER/AI_BRIDGE/general record, then verify readback.

## Policy boundaries

General TEST signup is public; organizer/reviewer identities remain invited.
Earlier rounds are frontline-managed; retained final scoring is invited TEST.
Official payment, public final voting and real-document upload require their
own approved policy and safety acceptance. Preserve the public entry URLs.
Old workers.dev/Pages addresses are historical/internal references, not a new
frontline website. Privacy scans must remain free of secrets and private data.

## Recovery

Revert the reviewed code change and redeploy through the trusted build. Keep
newer registrations and audit history. Whole-DB restore is a separate recovery
operation that must account for subsequent writes, not a frontend rollback.

Empty boxes define per-release evidence requirements; they do not erase prior
accepted evidence and are not the official53-item acceptance master.
