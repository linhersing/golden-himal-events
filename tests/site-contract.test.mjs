import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const htmlUrl = new URL('../index.html', import.meta.url);

async function homepage() {
  return readFile(htmlUrl, 'utf8');
}

test('registration action never exposes a submit endpoint', async () => {
  const html = await homepage();
  assert.doesNotMatch(html, /<form\b/i);
  assert.doesNotMatch(html, /\baction\s*=|fetch\s*\(|xmlhttprequest|webhook/iu);
  assert.match(html, /data-registration-preview/);
});

test('homepage contains one primary action and semantic sections', async () => {
  const html = await homepage();
  assert.equal((html.match(/data-primary-action/g) ?? []).length, 1);
  for (const sectionId of ['place', 'venue', 'event', 'registration']) {
    assert.match(html, new RegExp(`<section[^>]+id=["']${sectionId}["']`, 'i'));
  }
  assert.match(html, /<a[^>]+href=["']#main-content["'][^>]*>[^<]+<\/a>/i);
});

test('homepage contains no unapproved dates or prize claims', async () => {
  const html = await homepage();
  assert.doesNotMatch(html, /\b20\d{2}[-/.]\d{1,2}|\b(?:usd|npr|nt\$)\b|\bfirst prize\b|\bgrand final\b/iu);
});
