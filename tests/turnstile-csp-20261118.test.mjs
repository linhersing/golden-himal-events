import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const headers = readFileSync(new URL('../public/_headers', import.meta.url), 'utf8');
const js = readFileSync(new URL('../public/simple.js', import.meta.url), 'utf8');
const authPage = readFileSync(new URL('../public/member.html', import.meta.url), 'utf8');
const policy = headers.split('\n').find(line => line.trimStart().startsWith('Content-Security-Policy:'))?.trim() ?? '';
const directives = Object.fromEntries(
  policy.replace(/^Content-Security-Policy:\s*/, '').split(';')
    .map(segment => segment.trim()).filter(Boolean)
    .map(segment => {
      const [name, ...values] = segment.split(/\s+/);
      return [name, values];
    })
);

test('Turnstile explicit script and iframe hosts are allowed in the published static CSP', () => {
  assert.ok(directives['script-src']?.includes('https://challenges.cloudflare.com'));
  assert.ok(directives['frame-src']?.includes('https://challenges.cloudflare.com'));
  assert.ok(directives['connect-src']?.includes("'self'"));
  assert.ok(directives['script-src']?.includes("'self'"));
});

test('security boundaries stay closed while allowing Cloudflare challenge scripts', () => {
  assert.equal(directives['default-src']?.join(' '), "'self'");
  assert.equal(directives['object-src']?.join(' '), "'none'");
  assert.equal(directives['frame-ancestors']?.join(' '), "'none'");
  assert.equal(directives['form-action']?.join(' '), "'none'");
  assert.equal(directives['base-uri']?.join(' '), "'none'");
  assert.doesNotMatch(policy, /\*|unsafe-inline|unsafe-eval/i);
  assert.match(headers, /X-Frame-Options: DENY/);
});

test('Turnstile URL, explicit render and fail-closed front end remain intact', () => {
  assert.match(js, /https:\/\/challenges\.cloudflare\.com\/turnstile\/v0\/api\.js\?render=explicit/);
  assert.match(js, /humanState\('signupHumanBlocked','error'\)/);
  assert.match(js, /clearHumanToken\(\)/);
  assert.match(authPage, /id="signup-turnstile"/);
  assert.match(authPage, /id="signup-human-retry"/);
});
