import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function read(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8');
}

test('Vite build uses a repository-safe relative base', async () => {
  const config = await read('vite.config.mjs');
  assert.match(config, /base\s*:\s*['"]\.\/['"]/);
});

test('GitHub Pages workflow deploys only the reviewed branch', async () => {
  const workflow = await read('.github/workflows/deploy-pages.yml');
  assert.match(workflow, /codex\/initial-site/);
  assert.match(workflow, /actions\/deploy-pages@v4/);
  assert.match(workflow, /pnpm run build/);
});
