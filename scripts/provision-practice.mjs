// Only the already-authorized Cloudflare deployment build may touch remote E2E_DB.
// No runtime DDL; no token or raw CLI error output; no legacy database operations.
import {spawnSync} from 'node:child_process';
import {writeFileSync,mkdirSync} from 'node:fs';
if(process.env.WORKERS_CI!=='1'||process.env.WORKERS_CI_BRANCH!=='codex/initial-site'){
 console.log('Practice provisioning SKIPPED: not the trusted deployment build.');
}else{
 const evidence={revision:process.env.WORKERS_CI_COMMIT_SHA||null,status:'BLOCKED',database:'E2E_DB'};
 const run=args=>{const r=spawnSync('npx',['--yes','wrangler@4.156.0',...args],{encoding:'utf8',timeout:60000,maxBuffer:2*1024*1024});if(r.status!==0)throw Error('cloudflare_permission_or_command_unavailable');if(args.includes('--file'))return null;try{return JSON.parse(r.stdout)}catch{throw Error('cloudflare_evidence_unreadable')}};
 const rows=value=>{if(Array.isArray(value)){for(const x of value){const r=rows(x);if(r)return r}}if(value&&Array.isArray(value.results))return value.results;return null;};
 const bookmark=value=>{if(value&&typeof value==='object'){if(typeof value.bookmark==='string')return value.bookmark;for(const x of Object.values(value)){const b=bookmark(x);if(b)return b}}return null;};
 const query=sql=>{const value=run(['d1','execute','E2E_DB','--remote','--command',sql,'--json']);const result=rows(value);if(!result?.length)throw Error('cloudflare_count_evidence_unavailable');return result[0]};
 const counts="SELECT (SELECT COUNT(*) FROM e2e_accounts) AS accounts,(SELECT COUNT(*) FROM e2e_applications) AS applications";
 try{
  evidence.phase='bookmark';evidence.bookmark=bookmark(run(['d1','time-travel','info','E2E_DB','--json']));
  if(!evidence.bookmark)throw Error('restore_bookmark_unavailable');
  evidence.phase='before_counts';evidence.before=query(counts);
  evidence.phase='additive_migration';
  for(const file of [
   '1002_private_practice_ONLY.sql',
   '1004_self_service_signup_STAGING_ONLY.sql',
   '1007_test_application_approval_STAGING_ONLY.sql',
   '1010_nepal_locations_STAGING_ONLY.sql'
  ])run(['d1','execute','E2E_DB','--remote','--file','backend/migrations/'+file,'--yes','--json']);
  evidence.phase='readback';evidence.after=query(counts);
  evidence.schema=query("SELECT (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name LIKE 'ghv_practice_%') AS tables,(SELECT COUNT(*) FROM sqlite_master WHERE type='trigger' AND name LIKE 'ghv_practice_%') AS triggers");
  evidence.external_test_schema=query("SELECT (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name IN ('e2e_public_signup_attempts','e2e_public_signup_accounts')) AS signup_tables,(SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='e2e_test_application_approvals') AS approval_tables");
  evidence.location_schema=query("SELECT COUNT(*) AS tables FROM sqlite_master WHERE type='table' AND name='e2e_application_locations'");
  if(evidence.before.accounts!==evidence.after.accounts||evidence.before.applications!==evidence.after.applications||Number(evidence.schema.tables)!==12||Number(evidence.schema.triggers)!==21||Number(evidence.external_test_schema.signup_tables)!==2||Number(evidence.external_test_schema.approval_tables)!==1)throw Error('practice_provision_readback_mismatch');
  if(Number(evidence.location_schema.tables)!==1)throw Error('location_provision_readback_mismatch');
  evidence.status='PASS';evidence.phase='complete';
 }catch(e){evidence.reason=e.message;}
 mkdirSync('dist',{recursive:true});writeFileSync('dist/practice-build.json',JSON.stringify(evidence));
 console.log('Practice remote provisioning evidence: '+JSON.stringify(evidence));
 if(evidence.status!=='PASS')console.log('Existing site will still deploy; practice API stays fail-closed until its complete schema is available.');
}
