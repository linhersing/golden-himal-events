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
