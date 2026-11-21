# Public TEST member contact fields — 2026-11-21

## Cause and scope

The nine private registration controls were enabled only when the authenticated
member had a recovered email in `STAGING_ALLOWED_EMAILS`. Verified public OTP
members retain a mailbox fingerprint; password members retain their password
identity. Neither needs a recovered invited email. Consequently `/api/e2e/me`
omitted `muse_form_enabled` and the browser kept the private fieldset disabled,
although the performance name outside that fieldset remained editable.

The capability now requires the already authenticated member role and the
existing private-storage flag/schema check. Session and identity verification,
Turnstile, staff invitations, per-owner queries, organizer section permissions,
masked access audit and approval/score locks are preserved. There is no migration,
new public endpoint, raw-login-email storage or production feature switch.

## Verification

- First reproduce the failure for non-invited public and password identities.
- `node --test tests/public-member-contact.test.mjs`: invited, public and password
  members save five demos with nine private fields, read/correct their own fields;
  other members, reviewers, anonymous and unproven identities cannot access them.
  Organizer reads remain section-scoped and audited. Approval locks persist.
  Missing private schema or disabled storage flag still rejects writes.
- `tests/public-application-submit.test.mjs`: public 1/3/5-demo submissions now
  include required private contact details and reject invalid email input.
- `scripts/public-member-contact-isolated-test.mjs`: Microsoft Edge at 320, 390
  and 1440px fills the real page, submits to bundled Cloudflare workerd and reads
  back disposable D1 data. No application API response is mocked. A synthetic
  verified member session is seeded outside the member allowlist. This does not
  attest real OTP delivery, a human Turnstile interaction or a physical phone.
- The existing staff Edge CI entry runs this regression after the historical
  staff and current final-only policy checks. No workflow permissions are added.

Screenshots contain only fictional `TEST` inputs. Cloud evidence and exact run
results are appended to the existing MASTER and AI_BRIDGE records.

## Release and recovery

Release through the existing trusted Workers Build after reviewed PR checks.
That build records a fresh D1 Time Travel bookmark and checks preservation
counts. Verify the deployed commit in `/practice-build.json`; do not use a stale
snapshot as proof of the new release. This fix itself changes no remote schema
and creates no test records in the shared website database.

Rollback is a revert of this PR followed by the same trusted deployment. It
restores the old capability restriction but must not delete newly submitted
contact rows or restore the entire database: other people may have submitted
entries in the meantime. An emergency D1 restore requires a separately checked
restore point and preservation of subsequent writes.

Already open pages must reload to fetch the corrected `/me` capability. Copy any
unsent text before reloading. Expired sessions still need normal sign-in. Old
entries submitted without contact data are not fabricated or silently backfilled;
their owner can complete them through existing editing rules where permitted.
