import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const member=readFileSync(new URL('../public/simple.js',import.meta.url),'utf8');
const backend=readFileSync(new URL('../backend/staging-e2e.js',import.meta.url),'utf8');

test('January 2027 audition is clearly free on the member UI',()=>{
 assert.match(member,/a\.round_code!=='2027-01'\)actions\.append\(pay\)/);
 assert.match(member,/FREE · NPR 0 · 海選免費/);
 assert.match(member,/Free January audition/);
});
test('historical simulated payment remains test-only, never an actual charge',()=>{
 assert.match(backend,/Legacy simulated-payment endpoint remains TEST-only/);
 assert.match(backend,/realCharge:false/);
 assert.match(backend,/SIMULATED_PAYMENT/);
});
