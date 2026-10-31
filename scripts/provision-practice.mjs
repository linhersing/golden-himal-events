// Only the already-authorized Cloudflare deployment build may touch remote E2E_DB.
// No runtime DDL; no token or raw CLI error output; no legacy database operations.
import {spawnSync} from 'node:child_process';
import {writeFileSync,mkdirSync} from 'node:fs';
if(process.env.WORKERS_CI!=='1'||process.env.WORKERS_CI_BRANCH!=='codex/initial-site'){
 console.log('Practice provisioning SKIPPED: not the trusted deployment build.');
}else{
 const evidence={revision:process.env.WORKERS_CI_COMMIT_SHA||null,status:'BLOCKED',database:'E2E_DB'};
 const run=args=>{const r=spawnSync('npx',['--yes','wrangler@4.156.0',...args],{encoding:'utf8',timeout:60000,maxBuffer:2*1024*1024});if(r.status!==0)throw Error('cloudflare_permission_or_command_unavailable');try{return JSON.parse(r.stdout)}catch{throw Error('cloudflare_evidence_unreadable')}};
 const rows=value=>{if(Array.isArray(value)){for(const x of value){const r=rows(x);if(r)return r}}if(value&&Array.isArray(value.results))return value.results;return null;};
 const bookmark=value=>{if(value&&typeof value==='object'){if(typeof value.bookmark==='string')return value.bookmark;for(const x of Object.values(value)){const b=bookmark(x);if(b)return b}}return null;};
 const query=sql=>{const value=run(['d1','execute','E2E_DB','--remote','--command',sql,'--json']);const result=rows(value);if(!result?.length)throw Error('cloudflare_count_evidence_unavailable');return result[0]};
 const counts="SELECT (SELECT COUNT(*) FROM e2e_accounts) AS accounts,(SELECT COUNT(*) FROM e2e_applications) AS applications";
 try{
  evidence.bookmark=bookmark(run(['d1','time-travel','info','E2E_DB','--json']));
  if(!evidence.bookmark)throw Error('restore_bookmark_unavailable');
  evidence.before=query(counts);
  run(['d1','execute','E2E_DB','--remote','--file','backend/migrations/1002_private_practice_ONLY.sql','--yes','--json']);
  evidence.after=query(counts);
  evidence.schema=query("SELECT (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name LIKE 'ghv_practice_%') AS tables,(SELECT COUNT(*) FROM sqlite_master WHERE type='trigger' AND name LIKE 'ghv_practice_%') AS triggers");
  if(evidence.before.accounts!==evidence.after.accounts||evidence.before.applications!==evidence.after.applications||Number(evidence.schema.tables)!==7||Number(evidence.schema.triggers)!==4)throw Error('practice_provision_readback_mismatch');
  evidence.status='PASS';
 }catch(e){evidence.reason=e.message;}
 mkdirSync('dist',{recursive:true});writeFileSync('dist/practice-build.json',JSON.stringify(evidence));
 console.log('Practice remote provisioning evidence: '+JSON.stringify(evidence));
 if(evidence.status!=='PASS')console.log('Existing site will still deploy; practice API stays fail-closed until its complete schema is available.');
}
