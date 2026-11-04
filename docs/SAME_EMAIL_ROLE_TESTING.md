# One mailbox, explicitly invited test roles

This applies only to the closed Cloudflare staging preview. It does not enable public registration or official payments.

## Sign in

- Members use `/member.html`; staff use `/backoffice.html`.
- Staff enter one email and its real emailed OTP. The server selects organizer when invited, otherwise reviewer. Role controls appear only after authentication and only for current grants.
- An authenticated tester may switch between already granted roles without sending another email. The server rechecks the allowlist and rotates the session. Merely supplying a role never grants it.
- Member, reviewer and organizer lists remain independent. An ordinary invited member cannot inspect the organizer or reviewer APIs. Removing a grant invalidates that role's pending OTP and prevents existing sessions from working.
- The three-code-per-mailbox-per-ten-minute limit still spans all roles. OTPs remain single-use, expire in ten minutes and allow five attempts.

## Storage compatibility

The existing `e2e_accounts` schema has a unique email fingerprint and a single role per row. Existing legacy IDs and their applications/scores are preserved. Additional roles use a deterministic keyed HMAC of `role-account:<role>:<normalized-email>`. The database stores the fingerprint, never the raw email. A scoped role account is reused before considering a new legacy account, preserving reviewer identity after member deletion/recreation. No migration or deletion is needed.

Session authorization resolves these fingerprints against the current server-only invited lists on every request. `/me` exposes only account ID, active role and granted role names. Erasing a member also invalidates pending member challenges under the canonical mailbox fingerprint, without deleting unrelated staff accounts. The same mailbox cannot score its own singer application. One reviewer account cannot stand in for three independent judges.

There is one active role cookie per browser profile. Another open tab can become stale after a role switch; reload that tab. Its next API request remains subject to the server's active-role checks.

## Public launch is a separate implementation

`STAGING_E2E_ENABLED=false` disables this API; it does not switch to public registration. Public applicants must eventually be accepted automatically through a separate verified-email registration policy, while staff remain invitation-only. Before launch, implement and verify the public flow, a verified sending domain, bot verification, atomic abuse limits, independent judging/conflict policy, production data separation, backup/restore, privacy/retention rules and real payment reconciliation. Do not remove the current allowlist as a substitute.

The `onboarding@resend.dev` test sender is restricted to the Resend account owner's mailbox. A second staff mailbox cannot receive through this sender simply by adding it to an allowlist. Use a verified domain before inviting other real people.

## Verification and rollback

`tests/same-email-roles.test.mjs` exercises the real SQLite schema and backend: three exact-email roles, authorization boundaries, shared rate limit, switching, revoked grants, scoped-member erasure and self-review prevention. The browser regression covers one staff OTP, authorized tabs, reload, front/back navigation and mobile width.

Rollback the code change if needed; no schema rollback is required. Newly created scoped rows remain inert unless the matching role is explicitly granted. Preserve deployment variables with the existing `keep_vars: true`; never copy secrets into the repository or audit log.
