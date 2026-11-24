import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const member=readFileSync(new URL('../public/simple.js',import.meta.url),'utf8');
const backend=readFileSync(new URL('../backend/staging-e2e.js',import.meta.url),'utf8');

test('January 2027 audition is not blocked by checkout, and public payment UI is disabled',()=>{
 // Nov 18 Muse/Alan policy: public site must not surface payment UI.
 assert.doesNotMatch(member,/actions\.append\(pay\)/);
 assert.match(member,/memberNode\('p','januaryTestNotice','minor'\)/);
 const locale=readFileSync(new URL('../public/page-locale.js',import.meta.url),'utf8');
 assert.match(locale,/January 2027 audition TEST — eligibility review applies/);
 const memberPage=readFileSync(new URL('../public/member.html',import.meta.url),'utf8');
 assert.match(memberPage,/id="register"/);
 assert.match(memberPage,/data-l="statusPayment">Stage review<\x2fspan>/);
 assert.doesNotMatch(memberPage,/<button[^>]*>[^<]*(?:checkout|simulate payment)/i);
});
test('historical simulated payment remains test-only, never an actual charge',()=>{
 assert.match(backend,/Legacy simulated-payment endpoint remains TEST-only/);
 assert.match(backend,/realCharge:false/);
 assert.match(backend,/SIMULATED_PAYMENT/);
});
