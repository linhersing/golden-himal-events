# Cloudflare D1 — read-only deployment validation

This iteration advances the `ghv-staging` Worker connection from schema existence checks to **actual readback** of the fictional record that was inserted manually on October 28.

## What is verified

- `GET /api/staging/health`: Worker can bind to D1 and find the test table; writes are OFF.
- `GET /api/staging/sample-read`: Worker executes a prepared SQL SELECT of the fixed fictional `TEST-SINGER-001` record from `ghv_test_registrations` with no user-provided query and no PII. A missing fixture fails with 404.
- `POST /api/staging/registration-test` is denied with 503 when `STAGING_TEST_WRITE_ENABLED=false`. The automated test sends only a fixed synthetic sample; nothing is written.
- `.github/workflows/live-d1-smoke.yml` runs on pushes to `codex/initial-site` and waits for the Cloudflare Workers rollout before reporting an independent result. It uses only publicly accessible fixed test data and **no Cloudflare account token**.

## Deliberate safety boundary

The public site is not a live application. Live real applicant submission, payment, voting, admin backoffice, file uploads, and real participant identity verification remain disabled. The GitHub Actions workflow does not have a Cloudflare API token or privileged access; its POST test must be rejected.

Successful live GET readback means **Worker → D1 SELECT** works. It does NOT prove writes, concurrent transactions, time-travel restore, GDPR/local privacy compliance, or anti-fraud resistance. Do not add a public write endpoint for arbitrary input merely to make a demo easier.

## Rollback

GitHub branch `codex/initial-site` is the Cloudflare-linked branch. Restore a prior tested commit if the new read-only API interferes with static rendering, then inspect the Cloudflare deployment log. Do not modify the existing `ghv_test_registrations` table while this test is active.

## Future controlled write test

Requires a restricted operator-only test trigger (Cloudflare Access or a secret managed exclusively in Cloudflare), a staging-only one-time token, and an idempotent database constraint. Enable writes only for the test and disable afterward; export and verify D1 via Console. No user/private data are required.
