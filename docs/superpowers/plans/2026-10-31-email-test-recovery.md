# Email Test Recovery Implementation Plan

> **For agentic workers:** Execute in this session with superpowers:executing-plans.

**Goal:** Prepare actual Mailgun sandbox OTP and recoverable signup for one-inbox multi-role tests.
**Architecture:** A Worker-only delivery adapter with explicit provider selection, no activation or keys in source. Existing D1 schema and role checks remain unchanged.
**Tech Stack:** Worker ESM, FormData/fetch, D1, vanilla JS, Node SQLite and browser CI.
**Spec:** docs/superpowers/specs/2026-10-31-email-test-recovery-design.md

## Global Constraints
- No paid service, real registration fee, public signup, D1 migration, raw OTP/secret logs, or fake delivery claim.
- Account creation, recipient verification and private Secrets still need actual owner/account access.

## Review Focus
- Provider rejection, malformed acknowledgement, bad region/domain/sender: fail closed without exposing provider content.
- Five plus aliases: separate synthetic roles in one inbox, exact allowlists, no role escalation.
- Concurrent code requests: distinguish by reference; single-use semantics and per-session logout remain intact.
- Retry UI: failures do not show sent; cooldown and translated reference survive language changes.
- Current unconfigured cloud: remains BLOCKED; no real-cloud success inferred from CI.

## Tasks
- [x] Add failing delivery and OTP recovery tests; observe failures, then implement provider/configuration guards and failed-code invalidation.
- [x] Add localized resend UI, email request references, controlled browser regression tests.
- [ ] Full Node/build/privacy validation, independent code review, PR browser CI, merge and inspect real Cloudflare deployment.
- [ ] Record results, exact account blocker, single-inbox role plan and GPT/Gemini test coordination in shared Docs.

## Review record
- Important finding fixed: a late resend could relabel an edited recipient or overwrite a newer challenge; language changes could also re-enable a pending send. Capture the recipient and use a request generation plus pending state. `e2e-otp-client.test.mjs` fails against the pre-fix source and passes against the fix; full Node suite 86/86.
- Minor limitation retained: the SQLite test named concurrent OTP exercises multiple outstanding challenges in sequential calls, not truly simultaneous network requests. The new client test separately exercises overlapping delayed requests. Actual simultaneous GPT/Gemini cloud interaction remains unverified.
- Review declined actual provider delivery, account activation and deployed cloud acceptance. Preserve those as BLOCKED/UNVERIFIED until direct evidence exists.
