import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {publicSignupChecklist} from '../backend/staging-public-signup.js';

test('preview signup is opted-in but fails closed without real Turnstile and migrations',async()=>{
 const config=JSON.parse(await readFile(new URL('../wrangler.jsonc',import.meta.url),'utf8'));
 assert.equal(config.name,'golden-himal-voice-preview');
 assert.equal(config.keep_vars,true);
 assert.equal(config.vars.STAGING_TEST_APPROVAL_ENABLED,'true');
 assert.equal(config.vars.STAGING_PUBLIC_SIGNUP_ENABLED,'true');
 assert.equal(config.vars.STAGING_TEST_WRITE_ENABLED,'false');
 assert.equal(config.vars.STAGING_SUBMISSION_MODE,'links');
 const env={
  ...config.vars,STAGING_E2E_ENABLED:'true',STAGING_EMAIL_PROVIDER:'resend',
  STAGING_RESEND_VERIFIED_DOMAIN:'voice.cma-mission.com',
  STAGING_FROM_EMAIL:'verify@voice.cma-mission.com',
  STAGING_RESEND_API_KEY:'re_'+'x'.repeat(32),
  DB:{prepare(){return {async all(){return {results:[]}}}}}
 };
 const missingTurnstile=await publicSignupChecklist(env);
 assert.equal(missingTurnstile.ready,false);
 assert.equal(missingTurnstile.checks.turnstileSiteConfigured,false);
 assert.equal(missingTurnstile.checks.turnstileSecretConfigured,false);
 assert.equal(missingTurnstile.checks.publicTestApproved,true);
});
