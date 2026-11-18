# Golden Himal Voice — Payment readiness V1 (2026-11-18)

## Authority and scope

- **2026-11-16 internal contest rules:** Jan 1–31 audition and the Feb 12 first selection are free. The Mar 5 second selection has an **internal reference** of NPR 300 per person and the Mar 12 PK selection NPR 500 per person. These are not approved for public display; do not treat them as live payment configuration.
- **2026-11-18 latest Muse/Alan decision:** QR is for opening the registration form, **not** collecting money; the public website must not show entry fees or a payment CTA; actual collection method is to be determined in person.
- **2026-11-18 owner direction:** payment design may begin now; this does not approve merchant enrollment, real debits, production enablement or publication of internal fee amounts.

## Existing build boundaries

This PR is an isolated draft. The pure module `backend/payment-readiness.mjs` is not imported by the Worker, is not wired to a checkout route, and cannot collect funds. No D1 migration or provider credentials are involved. The public side changes only the registration QR anchor and removes payment-themed copy in scope; live site needs a separate isolated Cloudflare TEST deployment and end-to-end acceptance before release.

## When the frontline chooses how to collect

1. Determine the actual legal collector in Nepal, settlement account and signed scope; do not use an individual's personal wallet as a fake merchant API.
2. Decide between **offline/manual reconciliation** and an approved merchant checkout, potentially eSewa/Khalti. A static payment QR is only a transfer instruction, **never** automatic payment verification.
3. Approve per-stage fee and eligibility, invoice/receipt, tax handling, payer notice, refunds, cancellation and dispute terms in writing. Verify these before requesting money from a contestant.
4. If an online vendor is selected, put its production secrets only into Cloudflare encrypted secrets; require server-side signed callback + provider status lookup, transaction identifier, matching amount/currency/stage/payer and idempotent D1 write before marking paid.
5. In an isolated TEST database, separately test success, failure, timeout, replay, duplicate request, mispriced order, partial/pending, refund/reversal and backup/restore. Preserve immutable audit history.
6. Public January/February free entries may be submitted and reviewed **without a checkout or simulated-payment prerequisite**. Do not treat a TEST `simulated_paid` value as financial evidence.
7. Activate payment UI and routes only after organizer authorization, merchant approval (when applicable), real monitoring, UAT and a documented rollback plan.

## QR and mobile acceptance

Keep `https://goldenhimalpalace.com/member.html#register` stable. Route unauthenticated participants to sign-in/OTP, then make the registration form obvious. Test at 320/390px and desktop, include first login, failed OTP, successful form submit, D1 persisted readback, and a second account's denied access. Existing website links are not changed.

## Explicitly not complete

No approved provider selection, merchant account, credentials, live payment endpoints, manual receipt verification, completed financial D1 reconciliation, real user charge, remote TEST deploy, or official QR acceptance. This document does not authorize launch.

Cross-reference: [GitHub #176](https://github.com/linhersing/golden-himal-events/issues/176) and Google Drive `00_MASTER` / `00_AI_BRIDGE`.
