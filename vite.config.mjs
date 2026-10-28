import { defineConfig } from 'vite';

// Keep GitHub Pages preview intact, but use Cloudflare's own URL for its OG links.
// PUBLIC_SITE_URL may be set after a stable project/custom domain is approved.
const fallback = 'https://linhersing.github.io/golden-himal-events/';
const configured = process.env.PUBLIC_SITE_URL || process.env.CF_PAGES_URL || fallback;
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
