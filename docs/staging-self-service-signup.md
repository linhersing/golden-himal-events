# Protected singer self-service rehearsal

The main singer page supports self-service TEST signup through the preview Worker. Leave the public flag unset until launch checks pass. Both audition groups use the same email login and the existing eligibility rules. The owner and approved staff retain invitation access. Public test accounts can manage their own application and simulate checkout. Test voting and the finalist list remain restricted to invited accounts.

## Enable on the isolated preview Worker

1. Approve a project sender domain and verify it in Resend. Use a domain-scoped sending key and configure `STAGING_EMAIL_PROVIDER=resend`, `STAGING_RESEND_VERIFIED_DOMAIN`, `STAGING_FROM_EMAIL` on that exact domain and `STAGING_RESEND_API_KEY` as a Worker secret. Keep the signup flag off while rehearsing delivery to two invited, consenting external mailboxes. Check actual inbox receipt and successful login from both.
2. Create a Turnstile managed widget restricted to the preview hostname. Set `STAGING_TURNSTILE_SITE_KEY` and store `STAGING_TURNSTILE_SECRET_KEY` as a Worker secret. Verify the host restriction and keep pre-clearance off. The Worker checks the token, hostname and `ghv_signup` action for each self-service send.
3. Record the deployed Worker version and the recovery point for the isolated `E2E_DB`. Apply `backend/migrations/1004_self_service_signup_STAGING_ONLY.sql` to that database. Confirm existing records and role access with the flag off. Keep `STAGING_E2E_ENABLED=true` and `STAGING_SUBMISSION_MODE=links`.
4. Set `STAGING_PUBLIC_SIGNUP_ENABLED=true` for the preview only. Confirm `GET /api/e2e/signup-config` reports `public_test`. From the main registration page, use two distinct non-invited mailboxes. Confirm delivery, sign-in and readback for both groups. Check the expired-code, retry-limit and access-denied paths. Keep the TEST and no-charge notices visible.

The initial rehearsal budget is three sends per mailbox and eight public attempts per source IP every ten minutes, plus forty public attempts per rolling day. These are intentionally conservative pilot limits. Monitor Resend delivery and rejection counts during the pilot. The public send ledger stores keyed hashes of client IPs and prunes expired entries on subsequent public requests.

## Stop or recover

Set `STAGING_PUBLIC_SIGNUP_ENABLED=false` to pause self-service and public-only member sessions. The code and database changes are additive. Retain the recorded Worker version as the release rollback point. The sandbox sender and its single recipient can be restored together when needed. The verified sender domain setting must be removed when reverting to the sandbox sender. No real charge or official acceptance occurs in this rehearsal.

## 2026-11-10: external Email pilot decision and GitHub safety preflight

**Two different types of registration must not be confused:**

- **A. Two invited, consenting real TEST emails (recommended first):** keep `STAGING_PUBLIC_SIGNUP_ENABLED` false/unset. Add only the two approved test mailbox addresses to the existing comma-separated Cloudflare Worker **`STAGING_ALLOWED_EMAILS`** list, keeping the existing owner address. The existing invited Email OTP flow then allows each to verify, sign in and submit test-only D1 data. This is a Cloudflare runtime change; a GitHub merge alone cannot add private testers' emails. Verify receipt and account isolation. Do not put these email addresses or API keys in GitHub.
- **B. Self-service TEST signup for any uninvited Email:** leave OFF until a Cloudflare Turnstile widget is created and restricted to the preview hostname, the public signup schema migration 1004 is applied to the isolated `E2E_DB` after backup, real verified Resend sender credentials work, and a staff-approved security test plan is recorded. Only then set `STAGING_PUBLIC_SIGNUP_ENABLED=true`. Never enable actual paid registration or official participant approval this way.

After signing in to the **organizer-only** acceptance page `/organizer-stage.html`, use **"Check safety prerequisites / 檢查開通條件"**. This calls `GET /api/e2e/organizer-signup-readiness`, which returns only boolean checks (never mailboxes, password hashes, secrets, OTPs, or keys). Non-organizers receive 403; an unauthenticated caller receives 401. The panel never enables a flag or changes any D1 table.

Preflight checks: STAGING mode, explicit public TEST opt-in, links-only submission, exact verified-domain sender match, Resend Sending key configured, valid Turnstile site/secret key formats, and presence of both additive public signup tables in the isolated DB. **All green is necessary but not sufficient**: at least two independent external mailboxes must receive real OTPs, sign in, submit test entries and be read back by the organizer while unauthorized cross-account access remains denied.

### Current Cloudflare state at the 2026-11-10 21:45 screenshot
The owner verified:
- `STAGING_EMAIL_PROVIDER=resend`
- `STAGING_FROM_EMAIL=verify@voice.cma-mission.com`
- `STAGING_RESEND_VERIFIED_DOMAIN=voice.cma-mission.com`
- `STAGING_RESEND_API_KEY` stored as a Secret
- `STAGING_ALLOWED_EMAILS` still restricted to the owner's test email
- The public signup flag and Turnstile credentials were not shown as configured.

Therefore external uninvited Email registration is **not yet open**. Do not describe "Resend verified" or "Cloudflare variables saved" as a successful external registration test. The repo's `wrangler.jsonc` has `keep_vars: true`; verify Dashboard values again after any deployment. Never commit runtime secret values.

**Next acceptance sequence:** confirm Deployment SHA and rollback, invited TEST external mailbox OTP delivery, valid session and logout/login, application D1 readback, organizer can see each independent test application, role isolation, failure/abuse checks, then archive only redacted evidence in the two SSOT Google Docs. The manual organizer approval workflow is separately tracked in #79 and is **not implemented or enabled** by this PR. Real payments remain OFF.

## 2026-11-10 preview activation: operator steps (MUST NOT skip)

The preview Worker now declares `STAGING_TEST_APPROVAL_ENABLED=true` in `wrangler.jsonc`. **Public TEST signup deliberately has no GitHub default** and requires a separate Cloudflare runtime opt-in after the checks below. Actual uninvited signup is fail-closed until Turnstile site/secret keys, verified Resend sending setup and the isolated E2E_DB migration 1004 are present. Organizer approval requires additive migration 1007. The trusted Cloudflare build attempts additive 1004 and 1007 only for E2E_DB and emits `dist/practice-build.json`; check its `status`, bookmark and row counts in deployment evidence and do not assume success from GitHub merge alone.

1. In Cloudflare **Turnstile**, create a **Managed** widget named `Golden-Himal-Voice-TEST` restricted to hostname **`golden-himal-voice-preview.linhersing.workers.dev`**. No pre-clearance.
2. In Worker `golden-himal-voice-preview` → Settings → Runtime variables and secrets, add `STAGING_TURNSTILE_SITE_KEY` as Text and `STAGING_TURNSTILE_SECRET_KEY` as **Secret**. Never place the secret in GitHub, Google Drive, chat or screenshots. Deploy and check binding retention. **Only after all checks pass**, explicitly add `STAGING_PUBLIC_SIGNUP_ENABLED=true` as a Worker Runtime **Text** variable and deploy to begin the public TEST pilot.
3. Confirm `STAGING_RESEND_VERIFIED_DOMAIN=voice.cma-mission.com`, `STAGING_FROM_EMAIL=verify@voice.cma-mission.com`, and Resend API key remains a Secret. Preserve owner address on all three existing allowlists (member, organizer, reviewer). Public test registrations must **never** receive organizer or reviewer roles.
4. Visit `/api/e2e/signup-config` and verify it returns `mode: public_test` before sending any outside invitation. If still `invited`, do not bypass the checks. From `/organizer-stage.html` use the organizer-only readiness checklist, and verify `E2E_DB` schema 1004 and 1007 and deploy SHA.
5. Ask two **consenting** outside testers to complete genuine Email OTP, login, test-only entry, mock checkout and then confirm their entries remain **pending**. Use organizer account to manually approve each; only then may a reviewer receive the entries. Confirm session isolation and rejection of unverified/robot submissions. No real payment is accepted.
6. To disable new public TEST signup immediately, set `STAGING_PUBLIC_SIGNUP_ENABLED=false` **in the deployed Worker runtime** and redeploy; the GitHub source deliberately does not set this public switch. For emergency access stop, turn off `STAGING_E2E_ENABLED`. Never delete or overwrite existing D1 data as a fallback.

The approval feature is minimal (approve/pending); additional rejection, needs-correction, audit history and full contact-email encryption still belong to issue #79 before official launch. Resend Verified and a successful GitHub build are not proof of delivery or a completed official application.

## 2026-11-10 security hardening: external TEST signup must never bypass organizer approval

The public TEST signup readiness gate **requires both** `STAGING_TEST_APPROVAL_ENABLED=true` and verified presence of the isolated E2E_DB 1007 `e2e_test_application_approvals` table, in addition to Turnstile, Resend and 1004 public-signup schema. Previously, switching off the approval flag could still leave the public TEST signup open, or missing migration 1007 could cause people to receive OTPs only to fail after login. The hardening deliberately fails closed instead: `/api/e2e/signup-config` returns `mode: invited` until **all** requirements pass. Owner's existing invited Email flows continue. A new organizer-only readiness checklist shows the missing gate without disclosing secrets.

**Operator:** do not remove the manual approval switch or its D1 schema while public TEST registration is live. Before inviting anyone, check that `/api/e2e/signup-config` returns `public_test`; this proves configuration/schema presence only, not Email inbox delivery, payment, or successful real-person registration. For a safe recovery from `invited`, inspect the organizer readiness report and the deployment's `practice-build.json` for 1004/1007 migrations, rather than disabling approval checks. Official registration and real payments remain OFF.
