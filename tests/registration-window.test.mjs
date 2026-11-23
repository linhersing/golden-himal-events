import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {registrationWindow,OFFICIAL_START_UTC,OFFICIAL_END_UTC} from '../backend/registration-window.js';
import {handleE2E} from '../backend/staging-e2e.js';

const state=(mode,at)=>registrationWindow({GHV_REGISTRATION_WINDOW_MODE:mode},Date.parse(at));
test('schedule uses Nepal 00:00 at both boundaries, not Taiwan or browser timezone',()=>{
 assert.equal(new Date(OFFICIAL_START_UTC).toISOString(),'2026-12-31T18:15:00.000Z');
 assert.equal(new Date(OFFICIAL_END_UTC).toISOString(),'2027-01-31T18:15:00.000Z');
 assert.equal(OFFICIAL_END_UTC-OFFICIAL_START_UTC,31*86400000);
 assert.equal(state('scheduled','2026-12-31T18:14:59.999Z').phase,'countdown');
 assert.equal(state('scheduled','2026-12-31T18:15:00Z').phase,'awaiting_launch_approval');
 assert.equal(state('scheduled','2027-01-31T18:14:59.999Z').phase,'awaiting_launch_approval');
 assert.equal(state('scheduled','2027-01-31T18:15:00Z').phase,'closed');
});
test('TEST is explicit; operator can freeze immediately after acceptance',()=>{
 const testState=state('testing','2026-11-23T12:00:00Z');
 assert.equal(testState.phase,'testing');
 assert.equal(testState.testSubmissionsAllowed,true);
 assert.equal(testState.officialSubmissionsAllowed,false);
 for(const mode of ['paused','scheduled']){
  for(const date of ['2026-11-30T12:00:00Z','2026-12-31T18:15:00Z','2027-01-31T18:15:00Z']){
   const window=state(mode,date);
   assert.equal(window.testSubmissionsAllowed,false);
   assert.equal(window.officialSubmissionsAllowed,false);
   assert.equal(window.timeZone,'Asia/Kathmandu');
  }
 }
});
test('unknown mode is not mistaken for official mode',()=>{
 const s=registrationWindow({GHV_REGISTRATION_WINDOW_MODE:'live'});
 assert.equal(s.phase,'paused');
 assert.equal(s.officialSubmissionsAllowed,false);
 assert.throws(()=>registrationWindow({},NaN),/invalid_time/);
});
test('public endpoint accurately exposes safe countdown without database reads or applicant PII',async()=>{
 const req=new Request('https://goldenhimalpalace.com/api/e2e/registration-window');
 const env={STAGING_E2E_ENABLED:'true',STAGING_IDENTITY_SECRET:'x'.repeat(32),STAGING_PASSWORD_SIGNUP_ENABLED:'true',GHV_REGISTRATION_WINDOW_MODE:'scheduled',DB:{}};
 const response=await handleE2E(req,env);
 assert.equal(response.status,200);
 assert.equal(response.headers.get('cache-control'),'no-store');
 const data=await response.json();
 assert.equal(data.ok,true);
 assert.equal(data.timeZone,'Asia/Kathmandu');
 assert.equal(data.officialSubmissionsAllowed,false);
 assert.equal(data.testSubmissionsAllowed,false);
 assert.equal(data.opensAt,'2026-12-31T18:15:00.000Z');
 assert.doesNotMatch(JSON.stringify(data),/account_id|email|phone|token|password/i);
});
test('TEST submit, signup and state API have server-side gate (not merely a disabled button)',()=>{
 const code=readFileSync(new URL('../backend/staging-e2e.js',import.meta.url),'utf8');
 const submit=code.slice(code.indexOf('async function submitApplication'),code.indexOf('async function updateApplication'));
 assert.match(submit,/if\(!registrationWindow\(env\)\.testSubmissionsAllowed\)return deny\('registration_window_closed',403\);/);
 assert.ok(submit.indexOf('registration_window_closed')<submit.indexOf('INSERT INTO e2e_applications'));
 const signup=code.slice(code.indexOf('async function requestCode'),code.indexOf('async function verifyCode'));
 assert.match(signup,/!registrationWindow\(env\)\.testSubmissionsAllowed/);
 assert.match(code,/pathname==='\/api\/e2e\/registration-window'/);
});
test('all public entry countdown text has 3 locales and guard against interpreting count as admission',()=>{
 const ui=readFileSync(new URL('../public/registration-window-ui.js',import.meta.url),'utf8');
 for(const locale of ['zh:','en:','ne:'])assert.ok(ui.includes(locale));
 assert.ok(ui.includes('info.testSubmissionsAllowed'));
 assert.ok(ui.includes("awaiting_launch_approval"));
 const html=readFileSync(new URL('../public/member.html',import.meta.url),'utf8');
 assert.match(html,/id="ghv-entry-window"/);
 assert.match(html,/registration-window-ui\.js/);
});
