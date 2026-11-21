import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,copyFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
// Catch an accidental privileged migration in normal builds/PRs: it must exit before loading any credentials or CLI.
test('practice provisioning is inert outside the designated Cloudflare deployment build',()=>{const r=spawnSync(process.execPath,['scripts/provision-practice.mjs'],{env:{PATH:process.env.PATH,WORKERS_CI:'1',WORKERS_CI_BRANCH:'untrusted-feature'},encoding:'utf8'});assert.equal(r.status,0);assert.match(r.stdout,/SKIPPED/);assert(!r.stdout.includes('bookmark'));});
test('remote acceptance refuses to certify any deployment without an expected commit',()=>{const r=spawnSync(process.execPath,['scripts/live-practice-smoke.mjs'],{env:{PATH:process.env.PATH},encoding:'utf8',timeout:1000});assert.equal(r.status,2);assert.match(r.stdout,/expected revision/);});

// Real CLI contract regression with SQLite standing in for the external Cloudflare service.
// File imports may print progress text even with --json; successful exit plus real readback is authoritative.
test('successful SQL file import with progress output still verifies actual schema and preserved rows',{skip:process.platform==='win32'?'POSIX npx fixture; runs on Linux CI':false},()=>{
 const root=mkdtempSync(join(tmpdir(),'ghv-provision-output-')),script=resolve('scripts/provision-practice.mjs');
 try{
  mkdirSync(join(root,'bin'));mkdirSync(join(root,'backend/migrations'),{recursive:true});
  for(const file of ['1000_e2e_staging_acceptance_ONLY.sql','1017_staff_auth_limits_STAGING_ONLY.sql','1018_admin_registration_audit_STAGING_ONLY.sql'])
   copyFileSync('backend/migrations/'+file,join(root,'backend/migrations',file));
  for(const file of ['1002_private_practice_ONLY.sql','1004_self_service_signup_STAGING_ONLY.sql','1007_test_application_approval_STAGING_ONLY.sql','1009_test_video_supplements_STAGING_ONLY.sql','1010_nepal_locations_STAGING_ONLY.sql','1011_frontline_2027_registration_STAGING_ONLY.sql','1012_frontline_region_lock_STAGING_ONLY.sql','1013_member_corrections_STAGING_ONLY.sql','1014_demo_five_2027_STAGING_ONLY.sql','1016_january_demo_test_rosters_ONLY.sql','1013_muse_audition_details_STAGING_ONLY.sql','1015_muse_contact_handle_STAGING_ONLY.sql'])
   copyFileSync('backend/migrations/'+file,join(root,'backend/migrations',file));
  const cli=`#!/usr/bin/env node
import {DatabaseSync} from 'node:sqlite';import {readFileSync} from 'node:fs';
const args=process.argv.slice(2),db=new DatabaseSync('service.db');
db.exec(readFileSync('backend/migrations/1000_e2e_staging_acceptance_ONLY.sql','utf8'));
db.exec(readFileSync('backend/migrations/1014_demo_five_2027_STAGING_ONLY.sql','utf8'));
db.exec("INSERT OR IGNORE INTO e2e_accounts VALUES('existing-account','fixture-email','fictional','member',1,1);INSERT OR IGNORE INTO e2e_applications(id,account_id,round_code,category,province,location_basis,affiliation,stage_name,song_title,original_artist,song_language,song_key,created_at,updated_at) VALUES('existing-application','existing-account','2027-01','community','bagmati','work','TEST','TEST','Song','Artist','English','C',1,1);");
if(args.includes('time-travel'))console.log(JSON.stringify({bookmark:'TEST-RESTORE-BOOKMARK'}));
else if(args.includes('--file')){db.exec(readFileSync(args[args.indexOf('--file')+1],'utf8'));console.log('Executing SQL file against remote database. Success.');}
else{const sql=args[args.indexOf('--command')+1];console.log(JSON.stringify([{success:true,results:db.prepare(sql).all()}]));}
db.close();`;
  writeFileSync(join(root,'bin/npx'),cli,{mode:0o755});
  const invoke=()=>spawnSync(process.execPath,[script],{cwd:root,env:{...process.env,PATH:join(root,'bin')+':'+process.env.PATH,WORKERS_CI:'1',WORKERS_CI_BRANCH:'codex/initial-site',WORKERS_CI_COMMIT_SHA:'a'.repeat(40)},encoding:'utf8'});
  const r=invoke();
  assert.equal(r.status,0,r.stderr);const evidence=JSON.parse(readFileSync(join(root,'dist/practice-build.json'),'utf8'));
  assert.equal(evidence.status,'PASS');assert.deepEqual(evidence.before,{accounts:1,applications:1});assert.deepEqual(evidence.after,evidence.before);assert.deepEqual(evidence.schema,{tables:12,triggers:21});
  assert.deepEqual(evidence.external_test_schema,{signup_tables:2,approval_tables:1,video_supplement_tables:1});
  assert.deepEqual(evidence.location_schema,{tables:1});
  assert.equal(evidence.contact_schema_ready,true);
  assert.equal(evidence.contact_before,0);assert.equal(evidence.contact_after,0);
  assert.deepEqual(evidence.staff_schema,{tables:4,views:1});
  assert.deepEqual(evidence.competition_after,evidence.competition_before);
  const retry=invoke();
  assert.equal(retry.status,0,retry.stderr);
  const retried=JSON.parse(readFileSync(join(root,'dist/practice-build.json'),'utf8'));
  assert.equal(retried.contact_schema_ready,true);
  assert.equal(retried.contact_before,retried.contact_after);
  assert.deepEqual(evidence.frontline_and_corrections,{frontline:1,region_guard:1,correction_requests:1,correction_audit:1});
 }finally{rmSync(root,{recursive:true,force:true})}
});
