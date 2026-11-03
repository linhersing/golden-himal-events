# Golden Himal Voice — Resend OTP integration (staging only)

## Status / scope

As of 2026-11-03, the project owner has created a Resend account and **received the official Resend Hello World sample email** in the owner Gmail inbox. This does **not** mean the Golden Himal Voice website can send OTPs yet.

This change adds `STAGING_EMAIL_PROVIDER=resend` as a server-only send adapter for the existing D1-backed six-digit invited OTP login.

**Important: no domain is purchased or verified.** Resend's `onboarding@resend.dev` shared test sender is allowed only for the Resend account owner's verified mailbox. This adapter deliberately enforces **one configured test recipient** even if the application allowlist contains other addresses.

The existing Mailgun sandbox and native Cloudflare Email delivery modes remain unchanged. Never place the email API key in GitHub, frontend JS, screenshots, Drive minutes, or support messages.

## Phase A — One owner mailbox, safe trial

After the GitHub PR passes tests and is deployed, open Cloudflare Dashboard → Workers & Pages → `golden-himal-voice-preview` → Settings → Variables and Secrets, and **set the following server-side values**, never in browser/client JS:

| Key | Value (no credentials in docs) |
|---|---|
| `STAGING_EMAIL_PROVIDER` | `resend` |
| `STAGING_FROM_EMAIL` | `onboarding@resend.dev` |
| `STAGING_RESEND_TEST_RECIPIENT` | Your Resend account's own verified email address |
| `STAGING_RESEND_API_KEY` | **Secret**: a private Resend key with Sending access; regenerate before use because a previous key was displayed in a screenshot |
| `STAGING_ALLOWED_EMAILS` | The **same single test email address** |
| `STAGING_E2E_ENABLED` | `true`, only when ready to perform invited testing |
| `STAGING_IDENTITY_SECRET` | **Secret**: an unpredictable string with 32+ characters, if not previously configured |
| `STAGING_SUBMISSION_MODE` | `links` (existing setting) |

`E2E_DB` D1 binding and the nine `e2e_*` tables must remain in place. Other staff-role allowlists are not part of this owner-only singer test; do not add public email addresses.

The earlier screenshot exposed an API key, so **do not use that key for operational deployment**. Creating a second private Sending-only key and revoking the exposed key before enabling the integration is the safe approach.

## Phase B — Acceptance checks

1. Check the existing read-only API `/api/staging/e2e-readiness`. It may say `READY_FOR_INVITED_OTP_TEST` only when all required booleans are configured; this is **not** proof of delivery.
2. Visit `/member.html#login`, request a code with the **one approved owner mailbox**.
3. Confirm the six-digit code arrives in the inbox. Enter it on the same browser page and verify you can open your own member area.
4. Refresh, and verify your session remains valid and you can access only the member's own data.
5. Test invalid, expired, repeated codes; requests for unapproved addresses must be rejected before reaching the external email API.
6. Record results and GitHub PR/commit/deployment status in both `00_MASTER` and `00_AI_BRIDGE`, **without** codes or credentials. Remove only the disposable test emails after recording their outcome.

## Phase C — Future open registration (NOT enabled by this PR)

For delivery to unrelated Nepal participants, the organizer must obtain a domain they control, verify DNS at Resend, use a sender on that verified domain, review signup abuse protections, and explicitly remove the single-recipient restriction with code review and end-to-end tests. The production member signup policy must also be designed, since `STAGING_ALLOWED_EMAILS` currently permits **invited only**. Payment processing is separate and remains disabled.

## Troubleshooting

- `emailServiceConfigured=false`: Resend provider or API key, or the one test recipient is missing.
- `senderConfigured=false`: the sender must be exactly `onboarding@resend.dev` during this no-domain test phase.
- `memberAllowlistConfigured=false`: allow only the owner mailbox while testing.
- `test_email_service_unavailable`: denied recipient, provider failure, wrong key or invalid configuration; no raw provider error or API key should be sent to the client.
- API success/queued does not prove delivery to Gmail.
- Do not enable the general public signup until the domain and separate production identity policy are decided.

**Product rule:** Keep the singer-facing page simple: Email → six-digit code → my account. No provider jargon or test instructions on the public homepage.
