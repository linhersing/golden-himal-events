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
