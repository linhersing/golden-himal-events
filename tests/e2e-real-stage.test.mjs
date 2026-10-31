import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {handleE2E} from '../backend/staging-e2e.js';
const src=async p=>readFile(new URL(p,import.meta.url),'utf8');
test('e2e API fails closed without D1, sender, allowlist, and identity secret',async()=>{
 for(const env of [{},{STAGING_E2E_ENABLED:'true'},{DB:{},EMAIL:{},STAGING_E2E_ENABLED:'true'}]){
  const r=await handleE2E(new Request('https://example.com/api/e2e/me'),env);
  assert.equal(r.status,503);assert.equal((await r.json()).error,'e2e_not_configured');
 }
});
test('site connects the new paths to Worker but disables them by default',async()=>{
 const config=JSON.parse((await src('../wrangler.jsonc')).replace(/\/\/.*$/gm,''));
 assert.equal(config.vars.STAGING_E2E_ENABLED,undefined); // enable only via Cloudflare secret
 assert(config.assets.run_worker_first.includes('/api/e2e/*'));
 const worker=await src('../backend/staging-registration-worker.js');
 assert.match(worker,/import \{handleE2E\} from '\.\/staging-e2e\.js'/);
 assert.match(worker,/pathname\.startsWith\('\/api\/e2e\/'\)/);
 const sql=await src('../backend/migrations/1000_e2e_staging_acceptance_ONLY.sql');
 for(const table of ['e2e_accounts','e2e_email_challenges','e2e_sessions','e2e_applications','e2e_payment_events','e2e_judge_scores','e2e_live_scores','e2e_final_votes','e2e_promotion_events'])assert(sql.includes(table));
 assert.match(sql,/UNIQUE\(account_id,round_code\)/);
 assert.match(sql,/PRIMARY KEY\(application_id,reviewer_id\)/);
 assert.match(sql,/2027-01/);assert.match(sql,/2027-04/);
 assert.doesNotMatch(sql,/2027-09'\)/);
 assert.match(sql,/e2e_stage_quota/);
});
test('reviewer and participant UI are separate; passwords and real charges are not pretended',async()=>{
 const member=await src('../public/e2e-stage.html');
 const judge=await src('../public/judge-stage.html');
 const organizer=await src('../public/organizer-stage.html');
 assert.match(organizer,/data-role="organizer"/);
 const js=await src('../public/e2e-stage.js');
 assert.match(member,/data-role="member"/);
 assert.match(judge,/data-role="reviewer"/);
 assert(!judge.includes('id="application-form"'));
 assert(!member.includes('id="queue"'));
 assert.match(js,/\/api\/e2e\//);
 assert.match(js,/mock-payment/);
 assert.match(js,/score/);
 assert.doesNotMatch(js,/localStorage\.setItem\('ghv_member_sandbox_v1'/);
 assert.doesNotMatch(js,/localStorage\.setItem\('ghv_demo_active_member_v1'/);
});
test('staging runtime rejects missing sessions and restricts mutation by origin',async()=>{
 const api=await src('../backend/staging-e2e.js');
 assert.match(api,/HttpOnly; Secure; SameSite=Lax/);
 assert.match(api,/STAGING_ALLOWED_EMAILS/);
 assert.match(api,/STAGING_REVIEWER_EMAILS/);
 assert.match(api,/status:'simulated_paid'/);
 assert.match(api,/payment_status='simulated_paid'/);
 assert.match(api,/role==='reviewer'/);
 assert.match(api,/conflict_checked/);
 assert.match(api,/emailAllowed\(email,env,role\)/);
 assert.match(api,/origin_not_allowed/);
 assert.match(api,/e2e_not_configured/);
 const paths=['backend/staging-e2e.js','backend/staging-v2-flow.js','backend/staging-registration-worker.js','public/e2e-stage.js'];
 for(const path of paths){
  const res=spawnSync(process.execPath,['--check',new URL('../'+path,import.meta.url).pathname],{encoding:'utf8'});
  assert.equal(res.status,0,path+' '+res.stderr);
 }
});
