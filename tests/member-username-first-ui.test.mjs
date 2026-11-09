import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const member = readFileSync(new URL('../public/member.html', import.meta.url), 'utf8');
const controller = readFileSync(new URL('../public/password-member.js', import.meta.url), 'utf8');

test('member first screen is username-first, not an Email form', () => {
  assert.match(member, /id="member-auth-intro"/);
  assert.match(member, /id="step-login">1 · Account sign-in/);
  assert.doesNotMatch(member, /id="step-login"[^>]*Email login/);
  assert.match(member, /id="password-pending-screen" hidden/);
  assert.match(member, /name="username-preview"[^>]*disabled/);
  assert.match(member, /name="password-preview"[^>]*disabled/);
  assert.match(member, /id="password-practice-link"[^>]*href="\.\/practice\.html"/);
});

test('original invited Email login is preserved but collapsed by default', () => {
  assert.match(member, /<details id="email-signin-wrap" class="password-legacy">/);
  assert.doesNotMatch(member, /<details id="email-signin-wrap"[^>]*\sopen(?:\s|>)/);
  assert.match(member, /id="member-email-form"/);
  assert.match(member, /id="member-code-form"/);
});

test('username form cannot be submitted until server enables TEST authentication', () => {
  assert.match(controller, /conf\?\.enabled!==true/);
  assert.match(controller, /pending\.hidden=false;screen\.hidden=true;disclaimer\.hidden=true;return/);
  assert.match(controller, /pending\.hidden=true;screen\.hidden=false;disclaimer\.hidden=false/);
  assert.match(controller, /email\.open=false/);
});
