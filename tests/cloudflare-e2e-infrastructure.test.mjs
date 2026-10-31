import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../backend/staging-registration-worker.js';

const url='https://golden-himal-voice-preview.linhersing.workers.dev/api/staging/e2e-readiness';
const check=async env=>{
 const response=await worker.fetch(new Request(url),env);
 assert.equal(response.status,200);
 return response.json();
};
test('readiness denies real onboarding claims when Cloudflare bindings are absent',async()=>{
 const r=await check({});
 assert.equal(r.readiness,'BLOCKED');
 assert.equal(r.resources.databaseBound,false);
 assert.equal(r.resources.emailBound,false);
 assert.equal(r.resources.privateMediaBound,false);
 assert.equal(r.resources.schemaReady,false);
 assert.equal(r.ok,true);
 assert.equal(r.testOnly,true);
});
test('separate E2E database, media and mail bind without touching existing D1',async()=>{
 const env={
  DB:{prepare(){throw Error('Legacy synthetic DB must not be inspected for new member schema')}},
  E2E_DB:{prepare(){return {async first(){return {n:9}}}}},
  STAGING_MEDIA:{},EMAIL:{async send(){}},STAGING_FROM_EMAIL:'example@test.invalid',
  STAGING_ALLOWED_EMAILS:'member@test.invalid',
  STAGING_IDENTITY_SECRET:'X'.repeat(40),
  STAGING_E2E_ENABLED:'true'
 };
 const r=await check(env);
 assert.equal(r.readiness,'READY_FOR_INVITED_OTP_TEST');
 assert.equal(r.resources.schemaReady,true);
 const publicOutput=JSON.stringify(r);
 assert(!publicOutput.includes('member@test.invalid'));
 assert(!publicOutput.includes('example@test.invalid'));
 assert(!publicOutput.includes('XXXXXXXX'));
 const absent=await check({...env,STAGING_E2E_ENABLED:'false'});
 assert.equal(absent.readiness,'BLOCKED');
 const schemaMissing=await check({...env,E2E_DB:{prepare(){return {async first(){return {n:2}}}}}});
 assert.equal(schemaMissing.resources.schemaReady,false);
 assert.equal(schemaMissing.readiness,'BLOCKED');
});
test('readiness and member path are GET-only or fail closed',async()=>{
 const response=await worker.fetch(new Request(url,{method:'POST'}),{});
 assert.equal(response.status,405);
 const inactive=await worker.fetch(new Request(url.replace('/api/staging/e2e-readiness','/api/e2e/me')),{});
 assert.equal(inactive.status,503);
 assert.equal((await inactive.json()).error,'e2e_database_not_bound');
});

// A link-only rehearsal still requires real OTP/security setup; R2 is optional.
test('link-only readiness has no R2 prerequisite and cannot bypass email setup',async()=>{
 const env={STAGING_SUBMISSION_MODE:'links',E2E_DB:{prepare(){return {async first(){return {n:9}}}}},
  EMAIL:{async send(){}},STAGING_FROM_EMAIL:'sender@test.invalid',STAGING_ALLOWED_EMAILS:'member@test.invalid',
  STAGING_IDENTITY_SECRET:'X'.repeat(40),STAGING_E2E_ENABLED:'true'};
 const ready=await check(env);
 assert.equal(ready.readiness,'READY_FOR_INVITED_OTP_TEST');
 assert.equal(ready.resources.privateMediaBound,false);
 assert.equal(ready.submissionMode,'external_links');
 assert.equal(ready.privateMediaRequired,false);
 assert.equal((await check({...env,EMAIL:undefined})).readiness,'BLOCKED');
 assert.equal((await check({...env,STAGING_SUBMISSION_MODE:undefined})).readiness,'BLOCKED');
});

test('a configured Mailgun sandbox can serve invited OTP without a native Email binding',async()=>{
 const env={STAGING_SUBMISSION_MODE:'links',E2E_DB:{prepare(){return {async first(){return {n:9}}}}},
  STAGING_EMAIL_PROVIDER:'mailgun',STAGING_MAILGUN_DOMAIN:'sandboxabc123.mailgun.org',STAGING_MAILGUN_API_KEY:'test-key-'.repeat(8),
  STAGING_FROM_EMAIL:'test@sandboxabc123.mailgun.org',STAGING_ALLOWED_EMAILS:'member@test.invalid',STAGING_IDENTITY_SECRET:'X'.repeat(40),STAGING_E2E_ENABLED:'true'};
 const result=await check(env);assert.equal(result.readiness,'READY_FOR_INVITED_OTP_TEST');
 assert.equal(result.resources.emailBound,false);assert.equal(result.resources.emailServiceConfigured,true);
 assert.equal((await check({...env,STAGING_MAILGUN_API_KEY:undefined})).readiness,'BLOCKED');
 const publicOutput=JSON.stringify(result);assert(!publicOutput.includes('sandboxabc123'));assert(!publicOutput.includes('test-key-'));
});
