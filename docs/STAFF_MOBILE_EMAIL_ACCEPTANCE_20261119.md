# Golden Himal Voice | Staff mobile UI and Alan dual-role OTP acceptance gate
Date: 2026-11-19 (Asia/Taipei) — **TEST Worker only**.

## Owner-approved mobile IA — preserve the supplied 390px screenshots

- Roster: one application ID per touch target, stage name and abbreviated ID; display one state badge; no nested accordion per artist; searchable and paged with a collapsed advanced filter by default.
- Artist overview: exactly four separate touch cards, in order: **歌曲與影片**, **基本資料與照片**, **受控報名聯絡資料**, **報名審核與補件**.
- Opening a card **replaces** the prior panel; never append the four sections into one long page. Songs have a second level with one video at a time. Contact has four independently authorized and audited categories; do not preload or cache all private fields in the roster.
- **← 上一步** traverses to the prior level. **返回名冊** closes the artist workspace and preserves search text, filters, page number and keyboard focus. Browser Back/Forward must work.
- 48px or greater touch targets and no horizontal scroll on narrow 320–430px phones; include 280px, landscape, 768px and 200% text regressions. Desktop remains usable.
- Do not create duplicate cards during navigation, re-render or viewport rotation.
- Do not alter existing external video URLs or approved brand media assets.

Relevant tests: `tests/organizer-nested-record-browser.spec.mjs`, `tests/staff-session-expiry-compact-mobile.spec.mjs`; browser CI must pass before any release.

## Actual remote TEST facts, not simulated

Worker: `ghv-staff-test-20261119.linhersing.workers.dev`.
Source: draft PR #184 `codex/staff-workspace-20261118`; **not the public brand domain**.
Isolated D1: `ghv-staff-test-20261119-db` (existing TEST instance). Do not bind this to the brand Worker or copy production D1 data into it.

Public, read-only JSON: `https://ghv-staff-test-20261119.linhersing.workers.dev/api/staging/e2e-readiness`.
GitHub automated read-only check: `.github/workflows/staff-remote-readiness.yml`.

Snapshot at 2026-11-19 12:55 Taipei, from GitHub Actions 44461508740:
- `dualRoleInviteConfigured=true` — **one or more** overlapping role addresses, NOT proof that the intended Alan mailbox is the overlap.
- `staffSchemaReady=true`, `organizerInviteListConfigured=true`, `reviewerInviteListConfigured=true`, `explicitTestModeEnabled=true`.
- `humanCheckReady=false`, `emailProviderConfigured=false`, `senderConfigured=false`, `identitySecretConfigured=false`, so `dualRoleReadyForLoginTest=false`.

A Cloudflare build with success means code was deployed. A readiness boolean means server configuration looks complete. Neither proves an actual OTP email reached an inbox.

## Remaining configuration — Cloudflare account owner / authorized Work browser

Open **Workers & Pages → ghv-staff-test-20261119 → Settings → Runtime variables and secrets** (NOT the separate Build variables and secrets used for the D1 ID).

1. Add an **unpredictable, test-only, at least 32-character** `STAGING_IDENTITY_SECRET` as a Secret; never paste its value into GitHub, Drive, chat or screenshots.
2. Configure Turnstile for the **TEST workers.dev host**. Set `STAGING_TURNSTILE_SITE_KEY` as a Variable and `STAGING_TURNSTILE_SECRET_KEY` as a Secret. Keep `STAGING_STAFF_TURNSTILE_REQUIRED=true`; do not bypass the challenge to make testing green.
3. Configure a provider that is permitted to email the intended external invited mailbox. With Resend and a sender domain verified by its owner: `STAGING_EMAIL_PROVIDER=resend`, `STAGING_RESEND_VERIFIED_DOMAIN` matching the sender's domain, `STAGING_FROM_EMAIL` using that domain, and a privately created `STAGING_RESEND_API_KEY` Secret. **The shared `onboarding@resend.dev` test sender is restricted to the Resend account owner's verified mailbox**; it is not appropriate for an unrelated guest. A properly authorized Mailgun sandbox recipient is an alternate test-only path.
4. Retain both `STAGING_ORGANIZER_EMAILS` and `STAGING_REVIEWER_EMAILS`. The authorized account operator must privately verify that the *intended* invitation address appears in both; the public overlap boolean cannot identify which address.
5. Re-check `staff.dualRoleReadyForLoginTest===true`; all flags should be reviewed without disclosing any secret or actual mailbox. Then **the invited person** must open the TEST /backoffice.html page, pass Turnstile, receive a fresh six-digit OTP, log in, switch between Organizer and Reviewer, verify that no unauthorized actions are offered, and confirm permissions and results using fictional TEST data. Codes are single use, valid ten minutes; sessions do not mean forever.
6. Log only redacted results, timestamp, Worker version, count of test rows and outcome. Confirm Android and as applicable iPhone Safari. Keep PR #184 Draft and the public brand Worker unchanged until explicit approval.

## Release gates

- Node CI, browser CI, remote TEST deploy and read-only readiness: each verified against the **same commit**, not an earlier green run.
- Invited mailbox real delivery plus OTP success, server-side authorization for both roles, unauthorized-role denial, application/score readback and audit evidence.
- Mobile 320/390/430px and desktop views matching the four-card design and no overflow or duplicate pages.
- No production route, D1 migration, payment, or public invite is authorized by this checklist.
