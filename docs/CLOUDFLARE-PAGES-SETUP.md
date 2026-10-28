# Golden Himal Voice — Cloudflare Pages connection checklist

**Status:** This is the public static **design preview** only. No real registration or voting is live. Do not add secrets or personal information.

## Steps in Cloudflare dashboard

1. From Cloudflare **Account home**, select **Create app** (under **Ship something new**). If the navigation differs, use **Compute → Workers & Pages → Create application**.
2. Select **Pages → Import an existing Git repository**.
3. Choose **GitHub** and authorize **only the repository** `linhersing/golden-himal-events` rather than all repositories.
4. Choose repository `linhersing/golden-himal-events` and branch `codex/initial-site`.
5. Use:
   - Project name: `golden-himal-voice-preview` (if available)
   - Framework preset: `Vite` or `None` (manual values below override preset)
   - Production branch: `codex/initial-site`
   - Root directory: repository root (leave blank or `/`)
   - Build command: `pnpm run build`
   - Build output directory: `dist`
   - Environment: `NODE_VERSION=24`, `PNPM_VERSION=11.19.0`
   - Optional after project URL is assigned: `PUBLIC_SITE_URL=https://your-project.pages.dev/` (replace with actual URL)
6. Create/deploy. Cloudflare provides a `*.pages.dev` URL. This preview site is **publicly accessible** even with noindex; do not share the link widely and never enter real data.
7. Check the desktop/mobile UI, three language modes, demonstration registration, sample voting, static images, and browser developer console errors.
8. Check the built HTML's `og:url` and `og:image` point to Cloudflare, not GitHub, before sharing on LINE or Facebook. The existing `og:image` is the logo asset, not yet a properly designed 1200x630 social sharing card.

## Important

- The repository is Public and linked to a personally named GitHub account. An independent Pages hostname alone does **not** provide identity isolation. A later neutral account/repository/domain may be necessary before public launch.
- **Do not** choose direct ZIP upload: Git-based automatic deployments are preferred.
- Do not deploy the `backend/` Worker as part of this Pages static preview. The Worker is a separate, unconfigured **development draft**, with no validated voter identity or credentials.
- Do not create a live D1 database, email provider, or Turnstile secrets inside the public repo. Plan isolated staging first.
- New commits on the configured production branch trigger redeployment. Keep it clearly labelled PREVIEW until test and approval.
- Cloudflare and GitHub Pages previews are both publicly accessible; after migration and independent domain review, retire the old GitHub Pages entry to reduce confusion.
- The Pages `_headers` file marks the whole preview noindex and sets basic response headers; these are not replacements for WAF, authorization, or rate limiting.

## Recover

GitHub commit history records source revisions. Restore by deploying a known-good commit/branch rather than deleting the project. This does not restore a database: separate D1 backup/restore drills are mandatory before any live event.

Official reference: https://developers.cloudflare.com/pages/configuration/git-integration/
Official reference: https://developers.cloudflare.com/pages/configuration/build-configuration/
Official reference: https://developers.cloudflare.com/pages/configuration/build-image/
