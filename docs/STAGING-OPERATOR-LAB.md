# Golden Himal Voice — Internal front/back sandbox test lab

**TEST ONLY — staging, no real applicant data, no genuine file uploads, no money, no formal votes.**

## URL

- Cloudflare preview after merge: `https://golden-himal-voice-preview.linhersing.workers.dev/test-lab.html`
- GitHub Pages mirror: `https://linhersing.github.io/golden-himal-events/test-lab.html` (Cloudflare D1 calls will not work on GitHub Pages; use Workers link for Cloudflare integration evidence).

The main site's yellow preview banner contains an explicit `測試實驗室 / TEST LAB` link.

## Operable end-to-end browser-only drills

1. **Front desk:** choose one of six FIXED TEST personas, a proposed 2027 season (March, June, September), university/community, predefined fake demo-file placeholder and simulated receipt. No free-text names, real email, actual files or payments.
2. **Admin board:** approve, reject, return to pending; show registered/pending/approved/rejected counts; seed all six fictional personas.
3. **Announcements:** preview and toggle an announcement of approved fictitious people without affecting the public site.
4. **Voting:** four fictional voters vote for approved synthetic contestants; duplicate voter IDs are rejected in the local mock.
5. **Reports:** show local mock counters versus separately read real D1 test-only aggregate, export local JSON for testing, reset local mock without touching real D1.

The mock state is saved to browser `localStorage` under `ghv_internal_synthetic_lab_v1`. Do not interpret localStorage as the real database, authentication or a secure backoffice.

## Real D1 staging proof

`GET /api/staging/dashboard` executes a read-only aggregate restricted to rows whose `display_name LIKE 'TEST-%'` and `round_code='2027-03'` in the existing `ghv_test_registrations` table. It never exposes participant names, and the response includes `testOnly:true`, `source:'cloudflare-d1'`, `canWrite:false`. Together with `/api/staging/health`, it proves the hosting service can read the existing staging database.

The demo app NEVER sends any POST to Cloudflare. Existing temporary sample POST path remains disabled by `STAGING_TEST_WRITE_ENABLED=false`. The GitHub Actions smoke test continues to assert that public writes are denied.

**Important:** This is a credible UI/logic rehearsal combined with live D1 read-only telemetry. It does NOT prove the real full registration API, R2 file uploads, real payments, verified voting, permissions, backup, stress capacity or production personal-data security.

## Gate checklist before asking real applicants to test

- Isolated production database and real schema with unique indexes/transactions + migrations
- Real account verification and staff access control (e.g., Cloudflare Access), least privilege and audit logs
- Private R2 bucket binding for real demo files and proofs, file-type/size scanning and retention policy
- PCI-safe payment provider or controlled manual reconciliation, explicit NPR refund rules
- Actual complete end-to-end test: input → secure server validate → D1 write → staff review → public safe acknowledgement → backups and restore
- Version-specific Cloudflare deployment verification (current GitHub CI may see a successful older Worker)
- Rate limits, Turnstile, fraud controls, observability, incident response and staged load tests
- Cross-browser & Nepali/English/Chinese QA, Facebook/LINE OG preview and privacy/legal review
- Votes platform (TikTok/website/hybrid) not decided by the team; keep vote module replaceable

The official approval status of Alan's October 28 Draft 1 is *proposed*, not an official published contest rulebook.

## Safe reset

Click `清空本機測試資料` in the report tab. This resets only the browser sandbox. D1 and GitHub are untouched, and the fixed synthetic D1 fixture stays as audit evidence. Never issue a general `DELETE FROM` or point this tool at production data.
