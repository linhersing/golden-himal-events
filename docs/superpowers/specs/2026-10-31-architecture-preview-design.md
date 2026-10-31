# Review the architecture before enabling email or payment

The owner explicitly postpones email verification, password design and real registration-fee collection. Stop prompting for Mailgun signup. Finish a viewable site architecture first; keep actual authenticated registration closed.

Add a no-login read-only architecture review page with English, Nepali and Traditional Chinese views: overview, fictional participant center, three fictional judges and organizer/final calculation. The owner can inspect concrete fictional personas and fields through a direct URL.

Use three dedicated architecture_preview_* tables in the existing isolated E2E_DB with six fictional personas, two example entries and eighteen example scorecards. Take a Time Travel bookmark before an additive idempotent migration. Do not touch ghv-staging or create verified e2e_accounts/sessions. Read only this fixture set through a GET endpoint; no public mutations. Actual registration and score endpoints retain their existing gates.

All pages explain these are fabricated examples, not registered members, real submissions, actual advancement or votes. Work links are intentionally absent because no real test performance was supplied; do not invent a playable submission. No email, password, raw files or payments are collected. D1 availability failures show an error without fallback synthetic browser data. Only UI language may use localStorage.

Show Jan/Apr fields, 60/40 Demo, 40/30/20/10 live scoring and a clearly hypothetical final51/49 calculation. Official eligibility/voting decisions remain deferred. The tab switch is presentation, not authentication or role access. A4 print CSS shows all views as a brief, not a receipt. Add an obvious homepage entrance without replacing existing links.
