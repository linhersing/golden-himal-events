# Golden Himal Voice — design preview

This repository contains a public **design preview**, not an operational event registration or voting service.

## Preview

- Preview address: https://linhersing.github.io/golden-himal-events/
- Source branch: codex/initial-site
- Brand: Golden Himal Palace / Golden Himal Voice, Chitwan, Nepal
- Experience: English, Nepali and Traditional Chinese
- Features: announcement-category filtering, sample registration review, sample audience voting with reset, venue placeholders, responsive design
- Sharing: Open Graph and neutral favicon; custom domain is not configured
- SEO: deliberately noindex until release approval
- Photo policy: the approved brand asset is used; internal planning posters and unapproved people/venue photographs are not published

## Boundaries

**Do not submit real personal information.** Sample registration fields are never transmitted or stored. Sample votes exist only for the current open tab, reset on reload, and have no anti-fraud or official-scoring capability. Announcement cards are static placeholders. There is no database, authentication, email delivery, file upload, or operational admin panel yet.

No date, prize, shortlist, finalist number, organizer/legal entity, scoring weight, or sponsor is publicly claimed until verified and approved. The private project planning infographic must never be included in a public release.

## Run locally

Node 24 / pnpm 11:

~~~sh
pnpm install
pnpm dev
pnpm test
pnpm build
pnpm privacy:source
pnpm privacy:dist
pnpm test:e2e
~~~

## Launch blockers

1. Confirm organization and domain isolation. Public GitHub account metadata can expose associations, so a neutral site identity is needed for stronger separation.
2. Obtain approved rules, application privacy notice, deadline, eligibility and sharing permissions.
3. Build private, authenticated server-side registration storage and email handling; test with fictional data first.
4. Confirm voting eligibility and use verified identity plus atomic server-side counting, rate limiting and audit. Never trust browser counters or public Sheets API keys.
5. Review photo rights and social OG screenshot for LINE/Facebook; use own-hosted assets and neutral external domains.
6. Complete mobile and accessible interaction tests before turning off noindex.

Documentation and source status belong in project-controlled, private records. Never put private links, credentials, personal contacts or internal organization names into this public repository.
