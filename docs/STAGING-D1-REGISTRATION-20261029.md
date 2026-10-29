# Golden Himal Voice — Staging D1 connection (DRAFT PR)

This document describes an **isolated, fictional-data-only** connection between the public preview and the existing Cloudflare D1 `ghv-staging` database.

The real registration form remains a local simulation, no customer data is submitted, no actual application exists, no fees or files can be uploaded, and no voting backend is deployed.

## Architecture

`Cloudflare Worker + static assets` → `/api/staging/health` and `/api/staging/registration-test` → `D1 DB binding` → table `ghv_test_registrations`.

Existing setup:
- Cloudflare Worker project name: `golden-himal-voice-preview`.
- Existing Cloudflare D1 name: `ghv-staging` (previously created through Cloudflare Console).
- Existing table: `ghv_test_registrations` containing the fictional `TEST-SINGER-001` row.
- Database binding configured from source in `wrangler.jsonc` under `d1_databases[0]`, binding variable `DB`.
- Worker entrypoint: `backend/staging-registration-worker.js`, not the unfinished real vote Worker `backend/src/index.js`.
- Config contains `STAGING_TEST_WRITE_ENABLED: false` until explicit testing.

## Safe launch steps

1. Review this PR and confirm Node unit tests/build succeed. Do NOT enter personal information.
2. Merge only after review. Cloudflare Workers Builds will automatically deploy the configured branch `codex/initial-site` from GitHub. Check deployment logs for the D1 binding, rather than assuming the D1 binding exists.
3. In the **Cloudflare** preview site, complete the sample registration by selecting **Fill sample data**, Review, Complete preview.
4. Click **Check D1 connection**. It makes a **GET** to the same-origin `/api/staging/health`. Expected JSON is `{ok:true,testOnly:true,tableReady:true,canWrite:false}`, and the page says writes are disabled. This validates Worker-to-D1 read access only, not a real applicant submission.
5. If authorized to perform the one-time write smoke test, change `STAGING_TEST_WRITE_ENABLED` to `true` in Wrangler config through a **reviewed GitHub commit**, then allow Cloudflare to redeploy. Do not assume manually edited dashboard variables override source config. Optional: restrict the preview with Cloudflare Access before enabling writes.
6. Repeat the sample screen, Check D1 connection, click **Send fixed fictional record**. The **only** request body is `{"sample":"TEST-SINGER-API-001"}`. No person/email/video values are ever sent. Expected D1 query:
   `SELECT * FROM ghv_test_registrations WHERE display_name='TEST-SINGER-API-001';`
7. Repeat 20 times. SQL uses a conditional insert to prevent unbounded demo rows; the formal registration system must use unique indexes, authentication, rate limits and a transactional state machine.
8. Set the write flag back to `false`, redeploy, and confirm it rejects any further POSTs.
9. Save the actual **Cloudflare** deployment number, screenshots, SQL readback, error/retry observations and rollback commit in the private Google Drive MASTER.

The write switch is **not** a production security boundary. Origin headers alone cannot authenticate humans; malicious scripts can forge them. The test endpoint never accepts arbitrary form values, so there is no personal-data collection, but it can still consume D1 queries/worker requests. Do not leave writes enabled.

## No premature integration with social voting

The registration / contestant / stage tables must remain independent from a future voting engine. Organizers may choose TikTok engagement, first-party votes, or a hybrid; no decision is final. Model `voting_provider`, `public_video_url`, `count_snapshot`, `captured_at`, `source` and review/audit state **only after** rules/permissions are finalized. TikTok embedding and official video metadata may be available under platform policy; there is no guarantee a third party can read or verify all video likes or users. No TikTok integration is enabled here.

## Invariants for the later real registration backend

- New private verified identities; per-season per-round uniqueness and category locking; only authorized staff can approve or verify a payment.
- Independent minimal personal data and consent; privacy policy, age eligibility and retention.
- Secure demo submission via R2 private object storage; D1 stores restricted object references, not unencrypted video/receipts.
- Email/phone verification where appropriate; protect against rate abuse, spam, replay, and concurrency; maintain audit logs and restoration drills.
- Staging and production isolated, with no real data in the public GitHub repository.
- Use Cloudflare Access or an appropriate authenticated admin service for non-public staging; no privileged admin endpoints in public site.

See official docs:
https://developers.cloudflare.com/workers/static-assets/binding/
https://developers.cloudflare.com/d1/get-started/
https://developers.cloudflare.com/workers/wrangler/configuration/
