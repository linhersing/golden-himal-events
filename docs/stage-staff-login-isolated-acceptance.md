# Isolated staff OTP bridge — draft acceptance, 2026-11-21

This draft stacks on PR190 / b7565de and merges current main dbdd5ee into its own branch. It adds no production route, deployment configuration or schema migration. Main final-only judging and private member contact changes are retained. Only the isolated stage Worker imports the new login assets.

## Scope and behavior

The Worker allows GET staff-login-config/me and POST request-code/verify-code/logout/switch-role through the existing handleE2E implementation, using the same isolated E2E_DB as the stage/vote ledgers. All other E2E routes return404 and incorrect methods return405. The existing hostname, fictional-scope marker and rehearsal flag gates run first. Staff Turnstile protection must explicitly remain enabled; disabling it closes the login bridge. No cookie-header override, test OTP endpoint or special staff pass is introduced.

The dedicated fixture login offers Chinese, English and Nepali, explicit invited organizer/judge roles, ghv_staff_login human verification, one-time code entry, role-specific navigation and logout. Challenge expiration/error clears the token and disables code sending; stale callbacks cannot re-enable an older challenge. Login assets are no-store and use a CSP allowing only the Cloudflare challenge origin alongside same-origin resources. Expired-session logout returns to sign-in. Final judging navigation opens the existing final workbench directly; no earlier-stage online score requirement is added to main.

## Evidence

- Observed RED: four Node protocol tests failed404 before the dispatcher existed. GREEN: the initial four pass against actual SQLite-backed existing auth, stage and vote code. Review then reproduced four additional role/body-boundary failures and closed them; the final focused suite has10 passing tests.
- Node coverage: staff OTP delivery/verification creates the actual server cookie; invited organizer/judge isolation; wrong Turnstile hostname/action; uninvited mailbox non-disclosure; expired sessions; logout; cross-origin denial; unknown routes; missing staff-protection flag.
- Observed Edge RED: login asset absent404, then missing no-store header, then expired logout left stale session UI. Each was corrected and retested.
- Fresh Microsoft Edge contexts use no injected cookies. Local workerd calls the existing verification and email adapters; controlled external transports mock Turnstile and Resend. The captured fictional OTP is entered through the UI, and subsequent page fetches use the server-issued HttpOnly Secure cookie.
- Organizer1440px / judge390px complete OTP → final roster10 → vote API authorization → logout/expiry. Expired/error widget callbacks disable sending. Judge390px Chinese/English/Nepali views have no horizontal overflow.
- Original20 applications,54 Demo rows and0 legacy grades are unchanged. Main reports final_only.
- Full Node suite after review:310 total,309PASS,0FAIL,1existing Windows skip. Existing independent stage and final-vote Edge/workerd/restore rehearsals pass separately.

Commands, from this checkout:

```text
node --test tests/*.test.mjs
node scripts/stage-staff-login-isolated-test.mjs <Wrangler-tools-root> <evidence-directory>
node scripts/stage-ledger-isolated-test.mjs <Wrangler-tools-root> <evidence-directory>
node scripts/final-vote-isolated-test.mjs <Wrangler-tools-root> <evidence-directory>
```

Reviewed evidence: test-results/staff-login-reviewed/staff-login-evidence.json and organizer-authenticated.png, reviewer-authenticated.png, reviewer-zh.png, reviewer-en.png, reviewer-ne.png. Prior ledger evidence is in test-results/stage-regression and test-results/vote-regression. Evidence contains no OTP, raw session, voter credential or provider secret.

## Remaining gates and rollback

Mock provider callbacks do not establish actual human verification, actual mail delivery, remote hostname authorization or physical-phone acceptance. There was no remote deployment, remote schema change, real email, real identity document or public vote activation. The real finalist roster/import, final performance metadata, voter policy, actual Turnstile/mail resources and remote UAT remain separate gates. Only goldenhimalpalace.com is the user-facing/UAT entry; this draft is not a new public staff site.

Disable the dedicated stage rehearsal flag to close the entire isolated Worker. Revert this draft's bridge/assets to remove session establishment while preserving ledger data. No database restore is needed for these code changes. Native worktree creation returned neither a result nor an operation ID after120seconds; after checking inventory, an authorized Git worktree fallback was created and successfully attached. No other checkout was changed. Merge conflicts were limited to preserving optional fixture roles/flags and retaining both aggregate regression test sequences.

## Independent review correction

The first bridge allowed the underlying request-code handler to default a missing/invalid requested role to member, bypassing staff-specific human verification for an invited member. The reviewed bridge rejects missing/member/invalid request roles with403 before provider calls or auth writes; only staff/organizer/reviewer are accepted. Switching accepts only organizer/reviewer. Before verification, the existing challenge kind must be organizer/reviewer; a pre-existing member challenge cannot consume an attempt, become used or mint a session through this bridge.

Role inspection uses a cloned stream capped at2600 UTF8 bytes, cancelling overflow before JSON parsing without consuming the original body. The underlying auth handler receives that original request unchanged. Chunked multibyte JSON overflow, forbidden roles, content type and origin are checked without mail, verification transport, challenge, rate-ledger or session side effects. Fresh Edge/workerd evidence additionally confirms default/member/invalid role requests produce403 and no mail/challenge/rate writes before the normal staff OTP flow succeeds.
