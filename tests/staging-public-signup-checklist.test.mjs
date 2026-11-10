import test from 'node:test';
import assert from 'node:assert/strict';
import {publicSignupChecklist,publicSignupReady} from '../backend/staging-public-signup.js';

const validDB={prepare(sql){
 if(sql.includes('e2e_test_application_approvals'))
  return {async first(){return null}};
 assert.match(sql,/e2e_public_signup_accounts/);
 assert.match(sql,/e2e_public_signup_attempts/);
 return {async all(){return {results:[]}}};
}};
const base=()=>({
 STAGING_E2E_ENABLED:'true',
 STAGING_PUBLIC_SIGNUP_ENABLED:'true',
 STAGING_TEST_APPROVAL_ENABLED:'true',
 STAGING_SUBMISSION_MODE:'links',
 STAGING_EMAIL_PROVIDER:'resend',
 STAGING_RESEND_VERIFIED_DOMAIN:'voice.cma-mission.com',
 STAGING_FROM_EMAIL:'verify@voice.cma-mission.com',
 STAGING_RESEND_API_KEY:'re_'+'x'.repeat(32),
 STAGING_TURNSTILE_SITE_KEY:'0x'+'A'.repeat(30),
 STAGING_TURNSTILE_SECRET_KEY:'0x'+'B'.repeat(30),
 DB:validDB
});

test('safe external TEST checklist requires all gates, but exposes only booleans',async()=>{
 const env=base(),r=await publicSignupChecklist(env);
 assert.equal(r.ready,true);
 assert.equal(await publicSignupReady(env),true);
 assert(Object.values(r.checks).every(value=>value===true));
 const report=JSON.stringify(r);
 for(const secret of [env.STAGING_RESEND_API_KEY,env.STAGING_TURNSTILE_SECRET_KEY,env.STAGING_FROM_EMAIL])
  assert.equal(report.includes(secret),false);
});

test('external signup stays closed without explicit approval, valid mail provider, Turnstile and isolated D1',async()=>{
 for(const [key,value] of [
  ['STAGING_PUBLIC_SIGNUP_ENABLED','false'],
  ['STAGING_TEST_APPROVAL_ENABLED','false'],
  ['STAGING_SUBMISSION_MODE','uploads'],
  ['STAGING_RESEND_VERIFIED_DOMAIN',undefined],
  ['STAGING_FROM_EMAIL','onboarding@resend.dev'],
  ['STAGING_RESEND_API_KEY',undefined],
  ['STAGING_TURNSTILE_SITE_KEY',undefined],
  ['STAGING_TURNSTILE_SECRET_KEY',undefined],
  ['STAGING_E2E_ENABLED','false'],
  ['DB',undefined]
 ]){
  const env=base();env[key]=value;
  const r=await publicSignupChecklist(env);
  assert.equal(r.ready,false,key);
  assert.equal(await publicSignupReady(env),false,key);
 }
});

test('missing public signup migration fails closed without leaking SQL diagnostics',async()=>{
 const env=base();
 env.DB={prepare(){throw Error('no such table e2e_public_signup_accounts')}};
 const r=await publicSignupChecklist(env);
 assert.equal(r.checks.isolatedDatabaseReady,false);
 assert.equal(r.ready,false);
 assert.equal(JSON.stringify(r).includes('no such table'),false);
});

test('public signup fails closed if approval table is not migrated',async()=>{
 const env=base();
 env.DB={prepare(sql){
  if(sql.includes('e2e_test_application_approvals'))throw Error('no such table e2e_test_application_approvals');
  return {async all(){return {results:[]}}};
 }};
 const r=await publicSignupChecklist(env);
 assert.equal(r.checks.isolatedDatabaseReady,true);
 assert.equal(r.checks.organizerApprovalEnabled,true);
 assert.equal(r.checks.organizerApprovalSchemaReady,false);
 assert.equal(r.ready,false);
 assert.equal(JSON.stringify(r).includes('no such table'),false);
});
