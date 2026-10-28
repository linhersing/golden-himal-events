import { defineConfig } from 'vite';

// Keep GitHub Pages preview intact, but use Cloudflare's own URL for its OG links.
// PUBLIC_SITE_URL may be set after a stable project/custom domain is approved.
const fallback = 'https://linhersing.github.io/golden-himal-events/';
// WORKERS_CI is injected by Cloudflare Workers Builds. Keep social metadata
// on the Worker preview domain, rather than accidentally linking to GitHub.
// PUBLIC_SITE_URL takes priority when an approved custom domain is configured.
const workerPreview = 'https://golden-himal-voice-preview.linhersing.workers.dev/';
const configured = process.env.PUBLIC_SITE_URL || process.env.CF_PAGES_URL ||
  (process.env.WORKERS_CI === '1' ? workerPreview : fallback);
const siteUrl = /^https:\/\/[^\s/]+/.test(configured)
  ? configured.replace(/\/+$/, '') + '/'
  : fallback;

export default defineConfig({
  base: './',
  plugins: [{
    name: 'ghv-preview-social-url',
    transformIndexHtml(html) {
      return html.replaceAll('https://linhersing.github.io/golden-himal-events/', siteUrl);
    }
  }]
});
