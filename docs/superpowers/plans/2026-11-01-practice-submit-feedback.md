# Practice submission feedback implementation plan

> **For agentic workers:** Use superpowers:executing-plans inline. The user has already requested autonomous repairs and deployment within the existing testing boundaries.

**Goal:** Make mobile submission reliably explain validation, saving, verified completion and uncertain outcomes.

**Architecture:** Shared pure validation serves the browser and existing Worker error responses. The current portal owns a private in-memory submission result and focuses a receipt only after server readback. No new persistence, schema, payment or identity service.

**Tech Stack:** Existing plain JS/CSS/HTML, Worker, D1, Node SQLite and Playwright CI.

**Spec:** docs/superpowers/specs/2026-11-01-practice-submit-feedback.md

## Global constraints
- No schema changes, no user workspace deletion, no real email/payment/R2 activation.
- No credentials or contact values in logs, artifacts, Git or Drive.
- English, Nepali and Traditional Chinese; widths320/360/375/390/428px.
- Confirmed receipt requires matching actual application ID and submitted fields from GET me.

## Review focus
- A POST can commit while its response is lost: reconcile once, never blind retry.
- A successful POST followed by failed GET must retain its ID without claiming read verification.
- An existing entry with different contents must never be presented as this new submission.
- Role/session changes must not leak the receipt or old draft.
- Invalid native fields and backend errors must be visible near the action on mobile.

### Task1: submission lifecycle and feedback
Files: public/practice-validation.js, backend/practice.js, public/practice.js, public/practice.html, public/practice.css; tests/practice-validation.test.mjs, tests/practice.test.mjs, tests/practice-browser.spec.mjs.
Interfaces: validatePracticeApplication(values) -> field/message-key map; error response fieldErrors; POST application existing shape; GET me existing scoped shape.
- [ ] Write validation and real-handler/browser regressions before implementation.
- [ ] Observe Node RED and browser CI RED on original production code.
- [ ] Add shared validation, field errors, visible busy feedback, matching-readback receipt and uncertain-result verification.
- [ ] Run full Node and browser suites, build and privacy checks; inspect screenshots.
- [ ] Request one fresh focused review, address important findings with RED→GREEN.
- [ ] Merge/deploy only after checks, run actual HTTPS/D1 flow and readback, clean only its temporary workspace, append evidence to BRIDGE/MASTER.
