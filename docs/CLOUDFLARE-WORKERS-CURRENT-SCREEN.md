# Cloudflare Workers: current connected GitHub setup (October 28, 2026)

## Confirmed state
The Cloudflare screenshot shows **Set up your application** for a Worker, with the GitHub repository already authorized:
- Repo: `linhersing/golden-himal-events`
- Project name: `golden-himal-voice-preview`
- Build: `pnpm run build`
- Deploy: `npx wrangler deploy`
- Preview: `npx wrangler preview`

Unlike the older Pages onboarding instructions, these fields are for **Workers Builds**. We prepared `wrangler.jsonc` at repository root with a static asset directory `./dist` and no `main`. This deploys **only Vite's public preview** and keeps `backend/src/index.js` and D1 integrations undeployed.

## User steps, exactly on the screenshot
1. Before deployment, enable MFA/passkey for the owner accounts and confirm GitHub integration permits only this repository.
2. Keep the project name exactly `golden-himal-voice-preview` (must equal the Wrangler config name).
3. Keep build command `pnpm run build` and deploy command `npx wrangler deploy`.
4. Keep preview command `npx wrangler preview`; turn **Enable Preview builds OFF** initially, so private development branches are not automatically published.
5. Leave **Protect with Cloudflare Access** OFF for the first smoke test (note: the resulting `workers.dev` preview is publicly accessible). For confidential previews, configure Cloudflare Access after verifying an appropriate account and admin recovery path.
6. **Advanced settings:** if present, select the Git branch `codex/initial-site`; root directory must be the repository root. For build environment, Node 24 and pnpm 11.19.0 are expected (.node-version and packageManager in source). No API keys needed for a static site.
7. Select **Deploy** only when the latest GitHub Actions test has passed. A successful result should have an accessible Cloudflare URL similar to `https://golden-himal-voice-preview.linhersing.workers.dev/` (verify the actual URL shown; don't assume).
8. Check all UI sections, logo, EN/ने/中 languages, mock form, mock code and vote; confirm zero network writes; verify Open Graph points to Cloudflare rather than GitHub (see build config).
9. This project is **not** real enrollment, payment or voting. Do not collect personal data. Keep voting administration and D1 in a separate restricted environment.

## Identity, account and business continuity
- Reusing one Gmail address for Cloudflare and GitHub is normal. It creates a **shared email recovery dependency**, not automatic cross-service access.
- Set passkey/security key and 2FA on Google, GitHub, and Cloudflare separately. Save recovery codes offline; consider a second registered security key.
- Keep grant to GitHub **Only select repositories**, don't allow all repositories.
- Use separate project roles/Cloudflare account membership for future team administration. Do not share personal credentials or grant full owner access to every worker. Record emergency recovery ownership and billing.
- The username in `*.workers.dev` and GitHub account name may reveal a link to the owner's identity. Before public launch, move to an approved neutral custom domain and review organization GitHub repo identity/metadata.
- Deploy changes require peer review when real voter information or payment handling is enabled.

## What is NOT done
No Cloudflare project deployment has been verified from this GitHub commit yet. D1, Turnstile, actual voter verification, secure registration, payment verification, role controls, logging, load and disaster recovery are all unconfigured. GitHub Actions passing verifies tests/builds, not Cloudflare runtime behavior.

Official reference: https://developers.cloudflare.com/workers/ci-cd/builds/configuration/
Official reference: https://developers.cloudflare.com/workers/static-assets/
Official reference: https://developers.cloudflare.com/workers/static-assets/headers/
