import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseFrontline2027,frontlineJoin,frontlineSelect} from '../backend/frontline-2027.js';

const migration=readFileSync(new URL('../backend/migrations/1011_frontline_2027_registration_STAGING_ONLY.sql',import.meta.url),'utf8');
const backend=readFileSync(new URL('../backend/staging-e2e.js',import.meta.url),'utf8');
const base={frontline_2027:true,round_code:'2027-01',competition_region:'A',eligibility_basis:'enrolled',category:'university'};
test('2027 unified competition selects A/B independently of residential province',()=>{
 assert.deepEqual(parseFrontline2027(base),{entry:{competition_region:'A',eligibility_basis:'enrolled'}});
 assert.deepEqual(parseFrontline2027({...base,competition_region:'B',eligibility_basis:'graduated',category:'community'}),{entry:{competition_region:'B',eligibility_basis:'graduated'}});
 assert.deepEqual(parseFrontline2027({category:'university'}),{entry:null});
});
test('frontline fields fail closed on invalid region, eligibility, category, or outdated audition',()=>{
 for(const bad of [
  {...base,competition_region:'gandaki'},
  {...base,competition_region:'C'},
  {...base,eligibility_basis:'community'},
  {...base,category:'community'},
  {...base,round_code:'2027-04'}
 ])assert.ok(parseFrontline2027(bad).error,'should reject mismatched/invented input');
});
test('legacy D1 is not destructively changed and new region is not inferred from province',()=>{
 assert.match(migration,/CREATE TABLE IF NOT EXISTS e2e_frontline_2027_registration/);
 assert.match(migration,/CHECK\(competition_region IN \('A','B'\)\)/);
 assert.doesNotMatch(migration,/DROP TABLE|ALTER TABLE|UPDATE e2e_applications/i);
 assert.match(frontlineSelect(true),/competition_region/);
 assert.match(frontlineJoin(true),/LEFT JOIN/);
 assert.match(backend,/frontline_2027_registration_unavailable/);
 assert.match(backend,/insertFrontline2027/);
});

test('cross-region account guard is checked before the application is written',()=>{
 assert.match(backend,/competition_region_locked/);
 assert.match(backend,/priorRegion\.competition_region!==frontline\.entry\.competition_region/);
 const lock=readFileSync(new URL('../backend/migrations/1012_frontline_region_lock_STAGING_ONLY.sql',import.meta.url),'utf8');
 assert.match(lock,/BEFORE INSERT ON e2e_frontline_2027_registration/);
 assert.match(lock,/locked\.competition_region<>NEW\.competition_region/);
 assert.doesNotMatch(lock,/DROP TABLE|DELETE FROM|UPDATE e2e_/i);
});
