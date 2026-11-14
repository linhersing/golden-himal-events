# Staff login security rollout — TEST only (2026-11-12)

**Status: code prepared, do not assume Cloudflare is running it.** This change does not deploy, flip production flags, alter DNS, change accounts, create payment methods or write real user data.

## Existing protections

- All organizer and reviewer authorization is server-side, based on invited Email roles.
- Staff sign-in uses one-time 6-digit Email codes; a challenge is valid for 10 minutes, permits at most five wrong attempts, and the same mailbox has a three-code/ten-minute issuance cap.
- Sessions are D1-backed, 12-hour, random opaque cookie, `Secure; HttpOnly; SameSite=Lax`; POST requests require exact same-origin `Origin`.
- Reviewer scores use server role checks and score bounds; duplicate scores for one reviewer/stage are prevented by database constraints.

**Gap:** Before this change, invited staff could request Email codes without Turnstile; public TEST member signup already required it.

## New behavior

- New read-only endpoint `GET /api/e2e/staff-login-config` exposes only `required` and the public site key. It never returns the private secret, invite roster or account IDs.
- When `STAGING_STAFF_TURNSTILE_REQUIRED=true`, **all** organizer/reviewer OTP requests (whether `role=staff`, `role=organizer` or `role=reviewer`) need a fresh Cloudflare Turnstile token.
- The staff widget uses the distinct action `ghv_staff_login`, validated by the Worker using Cloudflare's Siteverify result (success, expected action, exact Worker hostname). Public signup token `ghv_signup` cannot substitute.
- Missing challenge, bad/expired token, wrong action, wrong host, missing keys or Cloudflare validation errors fail closed.
- Member→organizer/reviewer role switch is rejected under the flag to prevent using a member OTP as a bypass. Staff who need staff privileges must sign in using the staff form. Staff→staff switching remains available to already staff-authenticated sessions.

## Deployment instructions (manual, staged)

1. **Do not merge without CI and independent review** of this PR. Existing Cloudflare Worker active deployment SHA and rollback version must first be recorded.
2. Verify Cloudflare Turnstile widget is restricted to `golden-himal-voice-preview.linhersing.workers.dev`; public site key may be in Worker vars, server secret must be in Worker Secrets only. Separate widget and keys for staff recommended for production.
3. Deploy the UI and backend **and the updated `wrangler.jsonc` asset routing** together to a controlled preview, **leaving `STAGING_STAFF_TURNSTILE_REQUIRED` unset**. Confirm existing organizer/reviewer login still works. Verify the Worker intercepts `/backoffice` and `/backoffice.html`; with the flag enabled it must serve a CSP allowing `https://challenges.cloudflare.com` under `script-src` and `frame-src`, without weakening unrelated pages.
4. Test the staff widget in two real invited browsers (one organizer and one reviewer), including blocked scripts, expired token, wrong token/action/hostname, per-mailbox quota, staff permissions, and blocked member→staff switch.
5. Before enabling the flag, revoke existing staff sessions and expire any still-unused staff OTP challenges, or wait out the 12-hour session expiry and 10-minute OTP expiry; ensure a safe recovery path for the actual organizer. Do not expose or log codes.
6. Only then set `STAGING_STAFF_TURNSTILE_REQUIRED=true` on the **preview Worker**, deploy/restart as required, and verify `staff-login-config.required=true`, widget visible, two real staff can log in, and tokenless POST is rejected.
7. Independently verify organizer can read and approve only where authorized; reviewer can view eligible video and submit a score once, and neither role can access unauthorized private data. Monitor Siteverify failures and throttling, with masked logs. Roll back to the recorded prior version if login breaks. All payment and official registration remain OFF.

## Further defenses before public launch

- Add **Cloudflare Access** to the protected staff application, preferably a separated staff hostname with strict identity policies. Access is a second barrier, not a replacement for server-side RBAC or OTP.
- Add edge WAF/rate-limit rules for `/api/e2e/request-code`, `/api/e2e/verify-code`, staff access and abuse by IP/network, without blocking legitimate users on shared low-bandwidth connections.
- Consider stronger staff MFA/passkeys, shorter privileged sessions, session revocation on account/role changes, audit logging for approvals, scoring, admin privileges and promotion, D1 backup+restore drills, and independent security testing.
- Remove retired TEST recipients, restrict the staff link, and ensure the staff authorization policy cannot be inferred from public responses; never promise protection against every attacker.

This does not prove an official penetration test, Cloudflare real-token verification, or deployment. Retain existing working member/organizer/reviewer data and all original links.
