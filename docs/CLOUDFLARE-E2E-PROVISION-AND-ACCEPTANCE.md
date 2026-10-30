# Golden Himal Voice｜Cloudflare D1 + R2 + Email 實機開通（2026年10月30日）
## 讀者
Cloudflare 帳戶所有者、已授權的 ChatGPT Work / Gemini 測試代理。此文件不是系統已開通的證據。絕對不要將 Access Token、OTP、Cookie、私人證件或測試信箱清單寫入 GitHub 或共用 Google Drive。

## 當前已部署的程式資產
- Live preview: https://golden-himal-voice-preview.linhersing.workers.dev/
- Read-only capability check: https://golden-himal-voice-preview.linhersing.workers.dev/api/staging/e2e-readiness
- Member OTP: https://golden-himal-voice-preview.linhersing.workers.dev/e2e-stage.html
- Judges: https://golden-himal-voice-preview.linhersing.workers.dev/judge-stage.html
- Organizers: https://golden-himal-voice-preview.linhersing.workers.dev/organizer-stage.html
- Single SSOT for GPT/Gemini handover: https://docs.google.com/document/d/1vWnfXiKo1McKH4mCT7x00VktgXyiGPGzD0DIDyZYOJM/edit

**Old DB remains unchanged:** DB -> existing `ghv-staging`, id `93f23f1e-0c2b-41a6-8d8d-fb1a35d4a93a`, holds legacy synthetic fixtures. Do not migrate E2E tables into the old DB or enable STAGING_TEST_WRITE_ENABLED.
**New Cloudflare resources requested through Wrangler auto-provisioning:** E2E_DB -> brand-new isolated D1; STAGING_MEDIA -> brand-new private R2. The post-deployment readiness endpoint must confirm binding. Auto-provisioning may fail if account permissions/billing/Workers Builds do not permit it; no claim of actual creation without Cloudflare dashboard verification.

## Step 1: verify actual Cloudflare account bindings (no writes)
1. Open Cloudflare dashboard for the account that hosts `golden-himal-voice-preview`.
2. Workers & Pages → golden-himal-voice-preview → Settings → Bindings and Deployments: inspect E2E_DB and STAGING_MEDIA. Also inspect D1 > Databases and R2 buckets. Confirm E2E_DB points to **a distinct new database**, not `ghv-staging`, and R2 bucket is private with no public r2.dev / custom-domain access.
3. Record in BRIDGE: time, redacted deployment version/commit, E2E_DB binding true/false, database name and ID suffix (no secrets), R2 binding true/false, whether its bucket exists. If no binding, record BLOCKED and check Workers Builds logs. Do not turn on test mode.

## Step 2: apply isolated D1 schema (only with Cloudflare account authorization)
1. Confirm E2E_DB is new and empty. If **any** `e2e_*` table already exists, stop and inspect schema/migration history before proceeding. Never blindly run a second CREATE script.
2. Create/record a Cloudflare D1 backup or `npx wrangler d1 export <THE_NEW_DATABASE_NAME> --remote --output <SAFE_LOCAL_BACKUP_FILENAME>` (keep local and private, not in GitHub). For a blank database the backup mainly proves initial state.
3. Obtain the new D1 database UUID from Cloudflare and backfill the E2E_DB mapping in `wrangler.jsonc` after verifying it is the exact new database. **Never substitute the old ghv-staging UUID**.
4. From an authenticated Wrangler workspace (not public chat or GitHub Actions without credentials):
   - `npx wrangler d1 execute E2E_DB --remote --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;" --json`
   - If the E2E schema is absent, execute `npx wrangler d1 execute E2E_DB --remote --file backend/migrations/1000_e2e_staging_acceptance_ONLY.sql --yes` with a backup and after verifying that no incompatible tables exist.
   - Re-query all nine expected E2E tables and at least the stage quota/score guard triggers.
5. If the SQL import fails, stop and record the error; do not delete a live D1, reset tables, or overwrite the old database. The readiness endpoint should report `schemaReady=true` only after 9 E2E tables exist; this is a structural test, not a full migration integrity check.

## Step 3: private R2 for testing
1. Confirm STAGING_MEDIA binding to the new private R2 (Cloudflare auto-provisioning); no public domain is attached. Backfill the exact bucket_name in `wrangler.jsonc` after account verification.
2. Do NOT put actual Nepalese participant identity scans in stage. Use generated fictional PDF/image receipts, and a silent original video recorded/generated specifically for tests. Files are only readable by their owner or explicitly authorized organizer; reviewers see demo media only.
3. Verify uploading a TEST MP4/WebM up to 20 MB, eligibility PDF/image up to 5 MB, receipt PDF/image up to 5 MB. Real back-end blob readback and authorized/unauthorized access must be verified before PASS.

## Step 4: Email Sending (needs a verified Cloudflare DNS-owned sending domain)
1. Choose a domain *owned by Golden Himal Palace/event* and managed via Cloudflare DNS. Do not use unrelated NGO/Wanjun domains and do not use a private Gmail address as the `from` sender.
2. Cloudflare → Compute → Email Service → Email Sending → Onboard Domain, verify SPF/DKIM/DMARC in that account. Read official docs: https://developers.cloudflare.com/email-service/get-started/send-emails/
3. Only after domain verification, add to Wrangler `"send_email":[{"name":"EMAIL"}]` (prefer `allowed_sender_addresses` restricted to the verified sender; optional `allowed_destination_addresses` may be set **via private Worker/dashboard config** if the list should not appear in GitHub).
4. Use Worker Secrets (never Wrangler plain public vars for sensitive items):
   - STAGING_FROM_EMAIL = verified sender address; this is not a password but do not expose addresses in shared bridge.
   - STAGING_IDENTITY_SECRET = at least 32 chars of cryptographically secure random material, never copied into documents.
   - STAGING_ALLOWED_EMAILS = dedicated invited TEST member addresses (not user's personal mailbox).
   - STAGING_REVIEWER_EMAILS = three distinct reviewers.
   - STAGING_ORGANIZER_EMAILS = one independent organizer.
   - STAGING_E2E_ENABLED = true **only after all preflight requirements have passed**.
5. Existing Worker uses `env.EMAIL.send({from,to,subject,text,html})` with 10-minute six-digit OTP, 3 requests per 10 minutes and 5 attempts. This is **not** password or reset-password auth. A successful mail binding check alone does not prove deliverability; independently inspect actual TEST inbox delivery and resend/login.

## Step 5: real verification criteria (no simulated claims)
A. With `STAGING_E2E_ENABLED` still unset, the public `GET /api/e2e/me` returns HTTP 503 with `e2e_not_configured` when E2E_DB exists but email/secret is incomplete. Missing E2E_DB returns `e2e_database_not_bound`.
B. Once the readiness check reports `READY_FOR_INVITED_OTP_TEST`, issue request code from one allowlisted **test-only** email. Confirm email delivery via actual TEST inbox, not screenshot of simulated UI. Record event ID suffix and timestamps only; no OTP secrets in Drive.
C. Verify account, create new Jan 2027 D1 TEST application, record anonymous UUID suffix, upload TEST movie and fake proof docs to R2, run NPR 500 simulated payment (realCharge:false).
D. Log out, reopen on a second device, enter a new **actual** email code and confirm the same D1 application UUID and R2 file readback. Confirm denied non-allowlisted and improper role requests.
E. Three separate test judges score each stage; organizer promotes after scores; test final voting and independent 51/49 calculation; delete all synthetic records/files. Record evidence as A-level only after actual backend verification.
F. Any error -> BLOCKED/FAIL, no fake PAID or official voucher. User specifically dislikes inbox clutter: use dedicated inbox and clean TEST mail after recording results, do not touch normal business mail.

## Work mode handoff
**Current Chat mode does not have an authenticated Cloudflare control-panel connector or the originating browser context**, so a Cloudflare operator or ChatGPT Work with the user’s authenticated browser must perform Steps 1–4 in the Cloudflare account. Do not ask the user to paste account API tokens into chat. The source is ready; account resource provisioning, domain ownership, sender activation and secrets are not available from the GitHub connector alone. Each actual change must be reported in the shared BRIDGE by the actor that performed it.
