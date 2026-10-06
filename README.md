# Golden Himal Events

Development repository for the Golden Himal Palace event website.

Public in-progress preview: https://linhersing.github.io/golden-himal-events/

## Current stage

- Static website foundation and responsive public preview marked as in progress
- Local Golden Himal brand identity asset
- Venue, stage and restaurant photography slots awaiting approved on-site images
- Golden Himal Voice overview for adults aged 18 and above
- Registration status interaction only; no form data is collected or sent
- GitHub Pages deployment contains no active registration or data collection

## Local development

Requirements: Node.js 24 and pnpm.

```bash
pnpm install
pnpm dev
```

Open the local address printed by Vite.

## Verification

```bash
pnpm build
pnpm test
pnpm test:e2e
pnpm privacy:source
pnpm privacy:dist
```

The browser suite checks mobile, tablet and desktop layouts and verifies that the registration-status control does not create a network request.

Before a release review, set `PRIVACY_FORBIDDEN_TERMS` to a JSON array of the private source identifiers supplied by the project owner, then run both privacy commands. The private values stay in the local process environment and are never committed.

## Publishing boundary

The source repository remains Private while its sanitized preview is published through GitHub Pages. Keep the in-progress notice, no-index directives and non-functional registration state until the independent domain, approved public copy, final imagery and separate registration service have completed review.
