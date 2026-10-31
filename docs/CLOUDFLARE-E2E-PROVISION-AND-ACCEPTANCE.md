# Golden Himal Voice｜Cloudflare D1 + R2 + Email 實機開通（2026年10月30日）

## Latest owner decision — 10月31日: architecture first; defer email and real fees

The owner now postpones real email verification, password design and registration-fee collection. **Do not keep asking for Mailgun signup or enable invitation mode.** Prior email setup instructions below are a future option, not a current prerequisite.

The direct architecture preview is `/architecture-preview.html`, with overview/participant/judges/organizer tabs. Its dedicated read-only D1 fixture is not verified membership, real judging, actual promotion or voting. Role tabs do not authenticate. Six personas, two example entries and18 scorecards live in three `architecture_preview_*` tables, separated from all e2e member/session tables. Only GET `/api/staging/architecture-preview` exposes the fixed non-personal fixture; all writes are405. No browser data fallback is used if D1 is unavailable.

Apply only `backend/migrations/1001_architecture_preview_ONLY.sql` to E2E_DB after taking a current Time Travel bookmark and inspecting that these tables do not already contain unexpected data. It is additive and INSERT OR IGNORE; do not rerun1000 or changeghv-staging. Read back preview counts6/2/18 and verify e2e_accounts/e2e_applications remain unchanged. Work links are blank because no real performance was supplied; the UI must say so rather than invent a submitted video.

Keep full real Email→member persistence→judging acceptance as deferred/BLOCKED. A successfully displayed architecture page proves only that the illustrative fixture was read, not that a person registered or a judge logged in. Future implementation can use the existing guarded endpoints after the owner resumes email/payment decisions.


## Current decision — 10月31日: external performance links, no R2

The owner explicitly selected link submissions and instructed the R2 checkout tab to be closed. `wrangler.jsonc` now sets only the non-secret `STAGING_SUBMISSION_MODE=links`; invitation mode remains disabled. No R2 subscription, payment method, bucket or migration is needed for this path. Preserve the historical upload instructions below as a future option, not a current prerequisite.

- A required external HTTPS URL (YouTube, Google Drive, TikTok/Douyin or another public host) is stored in the existing `e2e_applications.demo_url` column. The Worker does not fetch, proxy, download, embed or claim to verify that URL.
- Ask entrants to verify viewing permissions while signed out. Only performance media may be shared; never collect public identity/payment-document URLs. External content may change or disappear, and an unavailable link is not a completed performance review.
- Link-only TEST scoring requires the saved URL and the D1 **simulated** payment event/status, with the existing invited judge, conflict, phase and role checks. Identity/receipt files are neither collected nor verified; every relevant screen discloses that limitation. This does not waive official eligibility or payment rules.
- Readiness reports `submissionMode=external_links` and `privateMediaRequired=false`. `privateMediaBound=false` is expected in this mode. Missing actual Email, sender, allowlist, identity secret or explicit invitation flag still produces BLOCKED. Do not bypass those checks.
- Steps C/D below become: save the work URL, simulate NPR 500, log out, authenticate by a new real email on another device, and read back the same D1 URL/application. Skip R2 uploads/file cleanup. Account deletion removes D1 links but never removes the external video.
- No first-time D1 migration is required. Do not rerun the existing migration or change `ghv-staging`.
- Email provisioning remains separate and UNVERIFIED. Mailgun Free/sandbox is a candidate for actual invited emails without buying a sender domain; the current Worker still requires its configured email binding. No Mailgun account/API secret was created by this code change.

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
**CURRENT BLOCKER 2026-10-30:** GitHub commit `ec3f7e5` attempted Wrangler auto-provision for isolated `E2E_DB` and private `STAGING_MEDIA`; the Cloudflare Workers Builds check returned **FAILURE** (build ID `08276796-afda-4b2e-9237-9f34576ba5eb`), and live GET /api/staging/e2e-readiness returned HTTP 404 twice. The actual build log is available only to the authenticated Cloudflare account operator. Do **not** assume database or bucket creation happened. To restore green deployments, the unfinished bindings were removed from the active root `wrangler.jsonc` and preserved as **inactive template** `wrangler.e2e.provision.jsonc`. Open the Cloudflare build log, verify your rights/billing and select resources before enabling bindings in active config. The existing D1 remains untouched, and the new E2E API stays fail-closed.

## Verified desktop update — 2026年10月30日 (supersedes the historical blocker above)

An authorized local Chrome session inspected Build `08276796-afda-4b2e-9237-9f34576ba5eb`. Its deploy log confirms D1 creation **succeeded**; deployment failed with Cloudflare error **10057**: `inherit binding 'STAGING_MEDIA' is invalid: previous version does not have binding named 'STAGING_MEDIA'`. R2 must be explicitly created and named before enabling its binding; do not retry the inactive template unchanged.

The account contains the distinct database `golden-himal-voice-preview-e2e-db`, UUID `2f7851ec-fb0b-43be-9958-b63bf04a9c6b`. Before migration, its console showed only Cloudflare's internal `_cf_KV` table. A pre-migration Time Travel bookmark was recorded privately in the shared Drive handover. This is a rollback point, not a downloaded SQL export. The V2 migration was then applied to **this new database only**. Console readback verified all **9 application tables, 5 triggers and 4 explicit indexes**, with zero accounts, applications, payment events, scores and votes. The legacy database was not modified. Do not re-run the initial migration over this now-existing schema.

This configuration pins that verified resource as `E2E_DB`; the remote Worker binding and `schemaReady` flags still require successful deployment and live readback. This is schema provisioning, **not** a verified member login or end-to-end application test.

Account-level blockers observed in the actual dashboard:
- R2 is not activated. Its activation accepts a renewing usage-based subscription, with a free allowance and overage billing. The activation button was **not** clicked; owner approval is required first.
- Email Sending offers **Purchase Workers Paid**. No plan upgrade was purchased.
- The account's Domains overview shows **No data available**. No event-authorized sending domain is configured. Do not add an unrelated organization's domain or invent a sender/test inbox.
- `STAGING_E2E_ENABLED` remains unset; no R2 or Email binding is enabled and no fixed-code login bypass is introduced.

## Step 1: verify actual Cloudflare account bindings (no writes)
1. Open Cloudflare dashboard for the account that hosts `golden-himal-voice-preview`. First inspect failed Workers Build `08276796-afda-4b2e-9237-9f34576ba5eb`, identify the **actual error**, and save a redacted error excerpt to GPT/Gemini BRIDGE.
2. Workers & Pages → golden-himal-voice-preview → Settings → Bindings and Deployments: inspect E2E_DB and STAGING_MEDIA (if any were auto-created before the build failed). Also inspect D1 > Databases and R2 buckets. Confirm any new E2E_DB points to **a distinct new database**, not `ghv-staging`, and R2 bucket is private with no public r2.dev / custom-domain access.
3. After account confirmation, create any missing resources in Cloudflare Dashboard or Wrangler with authenticated account access. Use **the inactive** `wrangler.e2e.provision.jsonc` as a wiring checklist, insert the verified real DB UUID and private R2 bucket name into root `wrangler.jsonc` only when they exist. Deploy a reviewed PR. Record version, E2E_DB binding, R2 binding, and bucket privacy in BRIDGE. Until then BLOCKED; do not turn on TEST mode.

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
1. After the owner approves account-level R2 activation, create a new private bucket and explicitly set its verified `bucket_name` for STAGING_MEDIA. Do not rely on the failed implicit/inherited binding. Confirm that no public domain is attached before deploying it.
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
The earlier mobile cloud-browser handoff did not complete. The authorized **desktop local Chrome extension session** subsequently reached the signed-in Cloudflare dashboard and applied the isolated D1 schema described above. This does not establish the cause of the mobile handoff failure. Remaining subscription acceptance, event-owned sender domain, dedicated inboxes and security settings still require their respective account permissions and evidence. Do not ask the user to paste account API tokens into chat. Each actual change must be reported in the shared BRIDGE by the actor that performed it.

## 10月31日 — one-inbox email rehearsal and recovery

The owner keeps actual registration-fee collection undecided. NPR 500 remains an explicitly simulated, non-chargeable D1 test event; no real payment provider/card/bank callback is configured.

Mailgun Free account page (observed, not yet completed): https://signup.mailgun.com/new/signup?currency=USD&plan_name=dev_free . It states cardless accounts can send 100 messages/day. Creating the account accepts provider terms; the owner must select a usable test mailbox and complete this step. Never select a paid trial to unblock testing.

After account/recipient verification, configure only in Cloudflare's private settings:
- `STAGING_EMAIL_PROVIDER=mailgun`
- `STAGING_MAILGUN_DOMAIN`: the real account sandbox domain ending `.mailgun.org`.
- `STAGING_MAILGUN_REGION=us` or `eu`, matching the sandbox.
- `STAGING_MAILGUN_API_KEY`: a sending key stored as a Secret, never source/Docs/chat.
- `STAGING_FROM_EMAIL`: a sender at that exact sandbox domain.
- Exact invited member/reviewer/organizer email lists and `STAGING_IDENTITY_SECRET` in private settings.
- Only after all security checks: `STAGING_E2E_ENABLED=true`. Never reuse the old D1 or disable OTP.

The adapter uses official fixed API hosts and multipart fields, requires TLS and certificate verification, disables message/open/click tracking, and never sets Mailgun's non-delivering `o:testmode`. API success only means queued, so separately inspect the real recipient inbox and actual D1 records. `resources.emailBound` still describes the native binding; `emailServiceConfigured` describes either configured provider. Neither proves delivery.

For a Gmail test inbox, exact `+ghv-member`, `+ghv-judge1`, `+ghv-judge2`, `+ghv-judge3`, `+ghv-admin` aliases can route into the same inbox. Confirm all five in the provider sandbox, and keep actual addresses out of GitHub/shared logs. They verify five synthetic roles, not independent people. Official identity/voting rules remain undecided. This should generate only a small, planned batch of test emails, cleaned after evidence is recorded.

An OTP can be requested again: each request has its own reference and ten-minute, single-use code. Match the reference, role and recipient; do not assume the newest inbox email belongs to the active browser request. Existing server cap is three requests per address per ten minutes; UI resends wait 60 seconds. After a failed send the challenge is invalidated, while failed attempts still count toward the request cap. On failure check address, Spam, sandbox authorization and provider logs, then retry within limits. Never expose the code in the page or bypass email.

Same-profile tabs share the session cookie, so member/judge switches must be sequential (log out each role), or use separately selected profiles/devices. GPT should perform the write test while Gemini reviews read-only evidence; BRIDGE is coordination, not a technical lock or proof Gemini stopped. Existing D1 uniqueness and stage guards remain the backstop. Test records are fictional only.
