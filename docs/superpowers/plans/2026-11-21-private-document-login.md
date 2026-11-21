# Private document OTP rehearsal implementation plan

> Execute inline with test-driven development and verification-before-completion.

**Goal:** Exercise the isolated synthetic private-document worker with real OTP-issued cookies rather than injected sessions.

**Architecture:** Add an exact path/method login dispatcher to the existing loopback-only Worker. Delegate authentication to `handleE2E` with the dedicated document D1 binding; retain the document worker's account, ownership, R2 journal, consent and size gates.

**Constraints:** New draft branch based on PR178 plus current main; no production deployment, migration/config changes, real email or documents. Microsoft Edge and disposable workerd ports only. No session header bypass or general E2E route forwarding.

## Tasks

- [x] Write behavioral Node tests for OTP issuance, cookie authentication and route restrictions; observe RED against the current worker.
- [x] Add only the required auth paths/methods; keep staff CAPTCHA fail-closed and document access unchanged; verify focused Node tests.
- [x] Run Microsoft Edge against random-port workerd/local D1/R2 using captured mock mail and mocked server Siteverify, fresh contexts and no cookie injection. Verify owner upload/read, organizer read-only, other member/reviewer/guest denial, logout/expiry, format/limit/idempotency and cleanup.
- [ ] Run the full Node suite and existing private-document integration regression, document evidence and limitations, commit and push a new draft PR targeting the original PR178 branch.

## Review focus

Unknown E2E paths remain404; wrong methods405; cross-origin writes403; missing staff protection503; server-issued cookies only; rejected OTP cannot authenticate; single-use OTP replay rejected; synthetic account allowlist and document ownership remain enforced; no mock mail/CAPTCHA bypass exists in production modules.

Ruling: login is explicitly invited-only, public signup must be false, and member CAPTCHA is checked by this wrapper because the upstream invited-member path skips it. Reviewer OTP creation and verification are unsupported; existing document authorization tests continue to cover reviewer denial. No main/public auth code changes.

Ruling: attach evidence through the existing sandbox workflow and child-test entry point; no workflow changes because the available GitHub token lacks workflow scope.
