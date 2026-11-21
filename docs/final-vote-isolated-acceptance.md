# Fictional final ballot lifecycle — draft acceptance boundary

Stack: PR188 rules → PR189 independent stage ledger → this PR. PR150 security foundation was read and reviewed, not blindly merged. No changes are routed through the brand Worker; no brand migration or official vote/payment flag is enabled. New migration1021 must only be applied to a verified new disposable TEST database after1020.

## What is implemented

Ten independently qualified fictional final entrants receive randomized public identifiers unrelated to rank. Initialization rejects non-TEST names. Draft candidates are hidden from public reads; all ten placeholder videos must be marked ready before a single shared TEST window opens. Placeholder URLs intentionally cannot play; actual consent/media acceptance is outstanding.

Organizer-only issuance accepts independently checked TEST-person identities, storing only HMAC fingerprints and an opaque eligibility ID. Email and IP are not uniqueness proofs. Secret-keyed recoverable credential delivery is bound to original issuer, person fingerprint and request ID; exact retry after a lost response returns the same credential, with no raw credential stored in D1 or browser storage. The UI retains the original pending issuance. Real-world identification policy/rotation/recovery requires a separately approved design.

HTTP casting requires same origin, JSON, bounded body, trusted edge IP, per-IP/per-credential TEST throttles, and server Turnstile success with exact hostname and ghv_final_vote action. No caller-supplied verified flag is accepted. One unique ballot per eligibility, an immutable receipt and audit in the same D1 batch. Independent voters do not contend on a stale global version; every accepted write increments the version used to freeze. Unknown outcomes retain candidate/request/credential only in page memory and must read the stored receipt. A definitive no-write error permits correction/new proof.

Authorized review appends invalidate/reinstate decisions with enumerated reasons; revocation excludes existing and future votes. No ballot or audit deletion. Close forbids new ballots, while review can continue before freeze. Freeze version-checks the valid-ballot snapshot and immutable final-grade count in one transaction, writes the51/49 result and freezes the stage ledger as well. Allzero valid votes means0vote points; ties require the named panel process and are blocked. No old category/paid gate is reused.

## Evidence actually obtained

Eight focused Node tests cover readiness/roles, safe public response, independent eligibility and receipts, retries, invalid/revoked/late ballots, atomic rollback, invalidation/freeze,6concurrent voters, issuance recovery, Turnstile hostname/action and throttling. Full suite:289total /288PASS /1existing Windows skip.

Actual Edge desktop1440/mobile390 against disposable local Cloudflare workerd/D1:6simultaneous votes plus3browser votes =9ballots, invalidation/revocation leaves7valid.30final judge grades and10finalists. Wrong96character credential correction, pre-write network failure followed by same-ID retry with lost committed response, readback confirmation, and lost issuance-response recovery all pass.280/320/360/375/390/412/430/480/768/1440px,200%text and three-language boundary checked. Candidate roster, confirmed receipt and organizer frozen-result screenshots are retained.

Provider calls in this rehearsal are MOCK Turnstile, not proof of actual Cloudflare hostname authorization or live verification. Cookies are fixture-injected; actual staff login is not covered. No physical Android/iPhone was used.

All14stage/vote tables were backed up and restored into a second empty disposable D1 fixture. Canonical per-table SHA256 matched; authenticated restored API returned frozen state and7valid ballots. Original20applications/54Demo rows/0legacy live grades stayed unchanged. Evidence JSON and fictional backup contain no raw credentials, cookie tokens, secret keys or real personal data.

## Deployment, rollback and remaining acceptance

Current brand main is f53e015547b34096c3e7c86f9e727df18e252c90. No new live/TEST deployment SHA exists for these drafts. Read-only Wrangler whoami reports unauthenticated in this workspace; no temporary anonymous account was used and no account was upgraded. Remote TEST requires authenticated project access, a new dedicated Worker/D1, reviewed empty-target backup/Time Travel point, secret bindings, staff invitation/login plumbing and a Turnstile widget authorized for that exact TEST hostname. Do not copy existing D1 or expose these fixture assets on goldenhimalpalace.com. The fixture-only Worker currently has no actual staff-login UI/routes, so it must not be presented as an interactive remote staff acceptance deployment.

Rollback affects only new isolated resources/entrypoint. Disable the dedicated TEST flag and preserve immutable audit, ballot and score history. Never restore a complete database over later registrations. Restoration scripts are for verified empty disposable targets, not an automatic production recovery command.

Pending: approved voter identity/window/limits and legal/publication consent; real video readiness; actual frozen January roster bridge and stage operating quotas/team policy/pairing; named jury tie decisions and replacement panel; remote concurrency/capacity and security review; actual login/live Turnstile; physical-phone/UAT; deployment authorization and version/backup evidence. TEST throttles60/IP/minute and10/credential/minute are rehearsal bounds, not approved production capacity. Official53checklist remains unchanged. Financial integrations and public collection remain ON HOLD per Muse/Alan11/18.
