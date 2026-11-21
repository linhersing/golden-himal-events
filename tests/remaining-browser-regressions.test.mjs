import test from 'node:test';
import assert from 'node:assert/strict';
import {additionalBrowserSpecs} from '../scripts/remaining-browser-regressions.mjs';

test('CI includes newly added specs without duplicating its initial suite',()=>{
 const workflow='      - run: pnpm exec playwright test tests/member.spec.mjs tests/staff.spec.mjs\n';
 assert.deepEqual(additionalBrowserSpecs(workflow,['tests/member.spec.mjs','tests/staff.spec.mjs','tests/new.spec.mjs','tests\\legacy.spec.mjs','tests/new.spec.mjs','tests/helpers.mjs']),['tests/legacy.spec.mjs','tests/new.spec.mjs']);
});
test('missing initial-suite configuration fails rather than silently omitting coverage',()=>{
 assert.throws(()=>additionalBrowserSpecs('run: echo no test',[]),/not found/);
 assert.throws(()=>additionalBrowserSpecs('run: pnpm exec playwright test --list',[]),/empty/);
});
