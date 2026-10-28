# Voting backend — implementation draft, NOT DEPLOYED

## Status

This directory is a **fail-closed starting point** for Cloudflare Workers + D1, not a production service. The GitHub Pages preview never sends real votes, phone numbers or personal data. No Cloudflare database, email sender or Turnstile credentials have been configured.

Voting endpoints refuse requests unless explicitly enabled AND all required bindings/secrets exist. Do not add production secrets to GitHub.

## Planned API

- POST \`/api/v1/vote/request\`: candidate + round + verified-email destination + Turnstile token; returns challenge ID after sending a code.
- POST \`/api/v1/vote/confirm\`: challenge ID + 6-digit code; database transaction accepts at most one vote for the hashed email per round.
- GET \`/health\`: shows whether a deployment is configured; no private information.

**Privacy:** the email address is used only for delivering a code. Only its keyed HMAC fingerprint is stored in D1. This is pseudonymous, not anonymous, personal data; retain it only as long as needed for vote integrity, then delete or aggregate under the published retention policy.

**Identity limitation:** an email address does **not** uniquely establish one human. Multiple emails, shared inboxes, inaccessible accounts, phone-based identity, cultural accessibility, and contestants themselves need a final rules decision. Rate limiting is approximate; D1 UNIQUE constraint is the strict one-vote-per-email-and-round guarantee.

## Required binding & secrets (operator must configure)

- D1 binding: \`DB\` (new isolated database, never a WordPress database)
- Rate-limit binding: \`API_RATE_LIMITER\`; scope by keyed voter ID
- Environment: \`ALLOWED_ORIGIN\` (exact independent website origin)
- Environment: \`TURNSTILE_HOSTNAME\` (approved independent domain)
- Environment: \`VOTING_ENABLED=false\` until signed launch approval
- Secrets: \`OTP_PEPPER\`, \`IDENTITY_PEPPER\`, \`TURNSTILE_SECRET\`, \`EMAIL_PROVIDER_KEY\`, \`EMAIL_FROM\`

Use different secrets and databases for staging and production. Domain verification for email delivery may be required by the provider. Do not enable without testable email delivery, privacy notice, human support and documented contest rules.

The frontend must eventually integrate the **real** Turnstile widget (action = \`ghv_vote\`) and these APIs. The existing demo verification code has absolutely no relationship to backend OTP and cannot be used to vote.

## Setup checklist

1. Create an independent Cloudflare account/site identity, D1 staging database and Worker. Confirm repository/domain privacy.
2. Apply \`migrations/0001_core.sql\` to the staging database.
3. Create a test round and test contestants with \`approved=1\`, with an explicit UTC opening and closing time.
4. Configure Turnstile hostname restrictions and secrets server-side. Configure a verified sender and email provider.
5. Execute test cases: wrong/expired/replayed code, different browsers same address, simultaneous requests, duplicated challenge ID, crossed round, open/paused/closed round, outage and retry, flood and rate limiting.
6. Conduct a controlled load test **only against an isolated staging system** with explicit agreed ceilings; check D1 overload and p95 latency, not only average throughput.
7. Test backup/export/restore to staging, compare counts and hashes before launch.
8. Obtain final contest rules, privacy notice, retention period, supervisor approval; enable \`VOTING_ENABLED=true\` as a separate production change.
9. Protect administrative publishing/scoring behind a role-based authentication service. This backend does not yet implement administration, registration or announcements.

## Example deployment config

Copy \`wrangler.example.toml\` and fill out your actual D1 database ID and namespace IDs locally; keep the private configuration and secrets out of public Git history. No CI workflow in this repository deploys the Worker.

## Backups and recovery

D1 Time Travel is not a substitute for independent backups. Export data before major changes and at agreed intervals to encrypted restricted storage, including schema version, UTC timestamp, checksum and row counts. Maintain a separate manifest and periodically restore a copy to staging to check completeness. Time Travel retention depends on plan; verify current documented Free/Paid limits. Never place real personal or voting data in this public repository or public Google Sheets.

Live protection additionally requires Cloudflare WAF/Bot management, observability, incident response, independent admin authentication, strict permissions, and legal privacy review.
