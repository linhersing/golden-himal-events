import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const member = readFileSync(new URL('../public/member.html', import.meta.url), 'utf8');
const controller = readFileSync(new URL('../public/password-member.js', import.meta.url), 'utf8');
test('normal member path is simple and never links to internal engineering practice',()=>{
 assert.match(member, /id="member-auth-intro"/);
 assert.match(member, /id="step-login">1 · Sign in/);
 assert.doesNotMatch(member, /password-practice-link|href="\.\/practice(?:\.html)?"/);
 assert.doesNotMatch(member, /username-preview|password-preview|password-pending-screen/);
});
test('invited Email account remains available now, without removing future username option',()=>{
 assert.match(member, /<details id="email-signin-wrap" class="password-legacy" open>/);
 assert.match(member, /id="member-email-form"/);
 assert.match(member, /id="member-code-form"/);
 assert.match(member, /id="password-auth-screen" hidden/);
});
test('gated password form stays hidden until server confirms readiness',()=>{
 assert.match(controller, /conf\?\.enabled!==true/);
 assert.match(controller, /portal\.hidden=true;screen\.hidden=true;disclaimer\.hidden=true;email\.open=true;return/);
 assert.match(controller, /portal\.hidden=false;screen\.hidden=false;disclaimer\.hidden=false;email\.open=false/);
});
