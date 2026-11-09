# Golden Himal Voice | No-email username/password test member entry

**Purpose:** Alternative to Email OTP for singers in the isolated preview only. Users choose a username (no phone or Email), a strong password, and receive a one-time high-entropy recovery code. Organizer and judge access stays strictly invited by Email. All payments remain simulated.

## What is implemented
- Main /member.html displays a mobile-friendly username/password registration/login/recovery interface when the feature is enabled. The original invited Email login remains accessible for legacy accounts.
- The preview currently uses a Cloudflare-compatible PBKDF2-HMAC-SHA256 derivation (100,000 iterations, the Worker production ceiling) with unique random 16-byte salts and a server-secret HMAC pepper that is never stored in D1. This is a limited-scope TEST design rather than a claim of meeting OWASP's recommended 600,000-iteration password storage cost. Do not use for officially accepted accounts before stronger deployment-supported KDF and real Cloudflare performance/security acceptance.
- 128-bit random recovery code shown exactly once, stored as an HMAC fingerprint, rotated on successful use. Old sessions are revoked on password reset.
- Registration requires verified Cloudflare Turnstile tied to the exact Worker hostname and action. All account events are rate limited by Cloudflare-derived IP fingerprint, with a temporary account lock after five bad attempts.
- Only the `member` role is possible. A member sees and edits only their own TEST application. Existing OTP accounts, reviewer and organizer roles are preserved.
- This is **not** a recommendation to send passwords over WhatsApp. Support staff must never ask for existing passwords or recovery codes. A production manual identity-verification/recovery procedure needs separate approval.

## How to enable safely
1. Keep `STAGING_PASSWORD_SIGNUP_ENABLED` unset/false while testing code and checking backup. Before enable, the existing invited Email sign-in must stay operational.
2. Record the current Cloudflare Worker version and D1 recovery point. Apply only `backend/migrations/1005_password_members_STAGING_ONLY.sql` to the separate `E2E_DB` after a backup. Never run it on the legacy `DB` or any live participant database.
3. Preserve the Worker identity secret. Rotating it invalidates existing password hashes and sessions. Validate all new password hash operations in the actual Cloudflare Worker, not only in Node or local Wrangler: the live runtime rejects more than 100,000 iterations per PBKDF2 call.
4. Create Cloudflare Turnstile widget bound to `golden-himal-voice-preview.linhersing.workers.dev`. Set `STAGING_TURNSTILE_SITE_KEY` and `STAGING_TURNSTILE_SECRET_KEY` in the same Worker (secret not in GitHub).
5. Set `STAGING_PASSWORD_SIGNUP_ENABLED=true` **on the isolated preview Worker only**. Confirm `GET /api/e2e/password-config` returns `enabled:true`, then test two distinct usernames and devices, submission, logout/login, isolation, recovery, expiry, frequency limits, and old invited Email login. Keep TEST MODE banner visible.
6. Log all tests with evidence, approve before any broadly advertised testing. No official enrollment or real charging.

## Recovery / disable
Set `STAGING_PASSWORD_SIGNUP_ENABLED=false` to disable password registration AND access for these test accounts. Do not delete the tables or member applications to rollback. Restore the prior Worker version if needed. Preserve and audit all test records; delete only with authorization.

## Notes
- A username is **not** proof of a real person's identity. No Email means reminders and results must use an approved alternate contact channel; public mobile number collection would need separate privacy and SMS verification decisions.
- Password authentication adds maintenance and abuse risk. It is not "100% no data leakage," and Turnstile does not guarantee every bot is blocked.
- Existing test-only signup global budget is 40 registrations/day; adjust only after operational review. This is independent of the Resend Email quota.
