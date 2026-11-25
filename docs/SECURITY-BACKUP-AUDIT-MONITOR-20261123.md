# Golden Himal Voice | Backup, audit, anomaly monitoring | 2026-11-23

Scope: existing TEST registration only. No approval to switch on official payment,
public voting or private identity uploads. Do not change Turnstile, OTP or roles.

## 1. Real backups

- EXISTING: the daily ChatGPT Git source and Drive conversation archival owner
  remains active and unchanged. Source bundles are not backups of D1 contestants.
  See docs/BACKUP-OWNERSHIP-AND-VERIFIED-COVERAGE.md for accurate coverage.
- NEW: a manual-only GitHub Actions workflow at
  .github/workflows/d1-encrypted-backup.yml is ready for authorized setup.
  It performs remote export of E2E_DB through a scoped Cloudflare token,
  rehearses SQL restoration in disposable SQLite, checks integrity and
  counts, seals bytes using AES-256-GCM, verifies ciphertext decryption,
  uploads encrypted archive and aggregate manifest only, and removes
  temporary plain SQL from the disposable runner.
- Three repository secrets must be set privately by an authorized maintainer:
  GHV_BACKUP_CF_API_TOKEN (restricted D1 read/export token),
  GHV_BACKUP_CF_ACCOUNT_ID and GHV_D1_BACKUP_KEY_HEX (64 hex chars).
  NEVER paste credentials into ChatGPT or commit them.
- GitHub Actions artifacts are retained seven days; this is not durable
  offsite backup. Transfer encrypted archives to a restricted long-retention
  independent storage destination approved by the organizer. Separately
  protect the decryption key. Do not put plaintext SQL into public Drive.
- Operator validation commands for protected temporary local copies:

      GHV_D1_BACKUP_KEY_HEX=<secret> node scripts/secure-d1-export.mjs export.sql archive.enc manifest.json
      GHV_D1_BACKUP_KEY_HEX=<secret> node scripts/recover-d1-export.mjs archive.enc restored.sql

- Required before calling backup operational: actual remote encrypted
  snapshot, independent decryption, restoration into a NEW ISOLATED staging
  database, all expected table counts and sample readbacks PASS. Preserve
  Cloudflare D1 Time Travel recovery point as another layer. Never restore
  a whole older database over newer registrations.
- No second recurring backup schedule has been created: avoid conflicting
  with the existing Golden Himal 18:00/23:00 owner until manual export,
  archival target and restore drill are demonstrably working.
- Current unverified coverage includes remote Worker build, actual D1 rows,
  private R2 objects, and email provider settings. None should be called done.

## 2. Immutable management audit

- Already implemented in backend/migrations/1018_admin_registration_audit_STAGING_ONLY.sql:
  e2e_staff_audit captures organizer actor ID/role, action, target ID,
  result, time and masked field-change indicators. SQLite triggers reject
  UPDATE/DELETE to historical audit rows.
- backend/staging-admin-registration.js covers organizer search, contact
  access, edits, disable, soft-delete, restore, audit read and rejection;
  backend/staging-registration-bulk.js records batch plans without physical
  removal of participant history. The new monitoring module uses only
  aggregate audit counts; identity information stays in access-controlled D1.
- Existing CI tests/admin-registration-audit.test.mjs and
  tests/staff-audited-contact.test.mjs must remain passing.
- Scope qualification: do not claim every future subsystem has comprehensive
  audit; judge score changes, delivery provider events and actual final
  votes require independently reviewed ledgers before official operation.

## 3. Automatic anomaly detection (read-only)

- backend/security-monitor.js runs through the EXISTING Cloudflare five-minute
  Worker cron once a reviewed SHA is deployed. Configuration flag:
  STAGING_SECURITY_MONITOR_ENABLED=true in proposed wrangler.jsonc.
- It measures a rolling ten-minute window in isolated E2E_DB. Thresholds:
  ten staff OTP requests/source, eighteen staff OTP verification attempts/
  source, five challenges with four or more failed OTP attempts, five
  denied staff audit actions, one hundred new OTP challenges, or ten
  successful organizer delete actions. Uses counts, never raw emails,
  names, original IPs, OTPs or sensitive submission fields.
- Emits a structured ghv_security_monitor status ok/attention/unavailable
  through Cloudflare observability. Missing database or schema is itself
  logged as unavailable without leaking secrets or SQL queries.
- A Cloudflare Logpush/alerting policy, tested delivery receiver and incident
  owner must still be configured independently. Logs being generated does
  NOT guarantee a human will be notified.
- If abnormal: investigate Cloudflare security/OTP/provider telemetry and
  sanitized D1 admin history with minimum-privilege access. Avoid deleting
  data or disabling authentication to clear an alarm.

## GO/NO-GO acceptance

- Run pnpm test, pnpm build, privacy scan and Edge/workerd CI on the
  exact PR head.
- Run backup manual workflow only after secrets securely configured.
  Download encrypted artifact, decrypt privately, verify SQLite/isolated D1
  recovery, and retain an encrypted copy offsite with approved retention.
- Verify deployed Worker SHA and five-minute monitor logs. Prove a test alert
  reaches a named human recipient before describing notifications as active.
- No production Cloudflare configuration, D1 data, account, or live payment
  is changed by this draft alone.
