import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const member=readFileSync(new URL('../public/simple.js',import.meta.url),'utf8');
const backend=readFileSync(new URL('../backend/staging-e2e.js',import.meta.url),'utf8');

test('January 2027 test application is visibly free and cannot enter simulated checkout',()=>{
 assert.match(member,/a\.round_code!=='2027-01'\)actions\.append\(pay\)/);
 assert.match(member,/FREE · NPR 0 · 海選免費/);
 assert.match(backend,/if\(app\.round_code==='2027-01'\)return deny\('audition_is_free_no_payment',409\)/);
 assert.ok(backend.indexOf("if(app.round_code==='2027-01')return deny('audition_is_free_no_payment',409)") < backend.indexOf("INSERT INTO e2e_payment_events"),'backend rejects free audition before recording payments');
});
