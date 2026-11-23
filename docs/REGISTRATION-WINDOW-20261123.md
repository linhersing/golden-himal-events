# Golden Himal Voice — registration window launch plan (2026-11-23)

## Grounded dates and scope
- Frontline Nov 16 approved Word states online audition entries: Jan 1–Jan 31, 2027, Nepal local time.
- Organizer Nov 23 meeting aims to publicize site early December, only after testing. Publicity is NOT an approved change to the official January entry period.
- Nepal midnight Jan 1 is UTC Dec 31 18:15 (Taiwan Jan 1 02:15). End exclusive: Nepal Feb 1 at 00:00.
- Muse and Alan Nov 18 want a registration QR, not a payment QR, and no public fee/payment operations now.

## Implemented in this draft PR
- A visible, responsive, accessible three-language information card and countdown on /member. Countdown uses the absolute Nepal-time target and server date offset.
- The Worker exposes GET /api/staging/registration-window with server phase, opensAt, closesAt and no identity fields; no-store and no reliance on login or database readiness.
- GHV_REGISTRATION_WINDOW_MODE is explicit: testing (existing TEST writes only), paused (stop new test submissions), scheduled (stop new test submissions; show countdown).
- Both the server API POST /api/e2e/applications and public TEST OTP entry refuse new submissions outside testing. UI also disables submission after obtaining server phase.
- After Nepal midnight on January 1, the card says awaiting organizer approval, NOT open, because the existing E2E_DB and API remain TEST-only. A browser clock cannot authorize submissions.
- Invalid explicit config fails closed to paused. Missing config preserves existing legacy TEST behavior; proposed wrangler config explicitly sets testing for the current UAT.

## To actually launch official January enrollment automatically
1. Obtain organizer GO, finalize true official signup fields, consent/terms, identity validation, and dates. December 1 remains promotional unless formal rules are changed.
2. Provision a separate official D1 storage and independent safe APIs; do not repurpose E2E_DB test rows or emails as official entries.
3. On the official production POST route, enforce approved start <= server time < end, real DB ready, authenticated user, anti-duplicate constraints, privacy and consent, and clear receipt.
4. Test official readback, real Turnstile/OTP delivery, real organizer permission, backups/recovery, alerting and all three languages on physical phones.
5. After UAT is signed, safely switch testing to scheduled in the approved Cloudflare configuration, deploy and read back actual SHA. Official activation requires a separate GO/NO-GO release; fail closed if any prerequisite is missing.
6. When official backend and date-based POST guard are proven, the public release can automatically transition on Jan 1 Nepal midnight and automatically stop new applications on Feb 1 Nepal midnight.

## Nonclaims and limitations
- This draft does not merge/deploy, does not close the live site now, and does not automatically activate official applicant collection on Jan 1.
- Existing registrants can still view their TEST accounts and records in paused/scheduled mode; only NEW test submissions are blocked. Existing edit/supplement workflows are not newly blocked by this PR.
- No production D1, R2 identity uploads, payment, public final voting or stage scoring rules have been changed.
- The full test and organizer sign-off / deployment and recovery proof must be preserved in MASTER and AI_BRIDGE.
