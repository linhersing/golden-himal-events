// Deploy only the isolated Golden Himal Voice staff TEST Worker.
// Fail closed if CI branch, account resources, or database isolation are uncertain.
import {readFile,writeFile,unlink} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';

const WORKER='ghv-staff-test-20261119';
const BRANCH='codex/staff-workspace-20261118';
const DATABASE='ghv-staff-test-20261119-db';
const PRODUCTION_D1_IDS=new Set([
  '93f23f1e-0c2b-41a6-8d8d-fb1a35d4a93a',
  '2f7851ec-fb0b-43be-9958-b63bf04a9c6b'
]);
const fail=reason=>{throw Error('Isolated staff TEST deployment blocked: '+reason)};
if(process.env.WORKERS_CI!=='1'||process.env.WORKERS_CI_BRANCH!==BRANCH)
  fail('requires a Cloudflare Workers Build for the reviewed staff PR branch');
const dbId=process.env.GHV_STAFF_TEST_D1_ID?.trim().toLowerCase();
if(!dbId||!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(dbId))
  fail('set GHV_STAFF_TEST_D1_ID in TEST Worker Build variables');
if(PRODUCTION_D1_IDS.has(dbId))fail('production database ID must never be used');
function wrangler(args){
  const run=spawnSync('npx',['--yes','wrangler@4.156.0',...args],{
    encoding:'utf8',timeout:120000,maxBuffer:2*1024*1024,
    env:{...process.env,CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV:'false'}
  });
  if(run.status!==0)fail('Cloudflare Wrangler '+args[0]+' command failed (check authorized TEST token and configuration)');
  return run.stdout;
}
let databases;
try{databases=JSON.parse(wrangler(['d1','list','--json']));}
catch{fail('could not verify isolated D1 database inventory')}
const matches=Array.isArray(databases)?databases.filter(row=>
  row?.uuid?.toLowerCase()===dbId&&row?.name===DATABASE):[];
if(matches.length!==1)fail('D1 ID must resolve to exactly '+DATABASE);
const base=JSON.parse(await readFile('wrangler.jsonc','utf8'));
if(base.name===WORKER)fail('unexpected source Worker configuration');
const config={
  name:WORKER,
  keep_vars:true,
  main:'./backend/staging-registration-worker.js',
  compatibility_date:base.compatibility_date,
  workers_dev:true,
  assets:base.assets,
  d1_databases:[{binding:'E2E_DB',database_name:DATABASE,database_id:dbId}],
  vars:{
    STAGING_E2E_ENABLED:'true',
    STAGING_PUBLIC_SIGNUP_ENABLED:'false',
    STAGING_TEST_WRITE_ENABLED:'false',
    STAGING_SUBMISSION_MODE:'links',
    STAGING_PRACTICE_ENABLED:'false',
    STAGING_TEST_APPROVAL_ENABLED:'true',
    STAGING_FRONTLINE_2027_ENABLED:'true',
    STAGING_FIVE_DEMO_REHEARSAL:'true',
    STAGING_MUSE_AUDITION_ENABLED:'true',
    STAGING_STAFF_TURNSTILE_REQUIRED:'true',
    STAGING_ADMIN_MANAGEMENT_ENABLED:'true'
  },
  observability:{enabled:true}
};
if(!config.assets?.directory||!config.assets?.binding)fail('assets configuration missing');
const path=resolve('.ghv-staff-test.deploy.json');

// Isolated empty D1 bootstrap, matching the already-reviewed disposable workerd
// fixture order. Never run against either existing preview/production D1.
const migrations=[
 '1000_e2e_staging_acceptance_ONLY.sql',
 '1003_entrant_profile_optin_STAGING_ONLY.sql',
 '1004_self_service_signup_STAGING_ONLY.sql',
 '1005_password_members_STAGING_ONLY.sql',
 '1007_test_application_approval_STAGING_ONLY.sql',
 '1009_test_video_supplements_STAGING_ONLY.sql',
 '1010_nepal_locations_STAGING_ONLY.sql',
 '1011_frontline_2027_registration_STAGING_ONLY.sql',
 '1012_frontline_region_lock_STAGING_ONLY.sql',
 '1013_member_corrections_STAGING_ONLY.sql',
 '1013_muse_audition_details_STAGING_ONLY.sql',
 '1014_demo_five_2027_STAGING_ONLY.sql',
 '1015_muse_contact_handle_STAGING_ONLY.sql',
 '1016_january_demo_test_rosters_ONLY.sql',
 '1017_staff_auth_limits_STAGING_ONLY.sql',
 '1018_admin_registration_audit_STAGING_ONLY.sql'
];
function d1Rows(sql,path){
 let payload;
 try{
  const stdout=wrangler(['d1','execute',DATABASE,'--remote','--command',sql,'--json','--config',path,'--yes']);
  payload=JSON.parse(stdout);
 }catch{fail('failed to read isolated TEST D1 schema')}
 const entries=Array.isArray(payload)?payload:[payload];
 const rows=entries.flatMap(entry=>Array.isArray(entry?.results)?entry.results:[]);
 if(!rows.length)fail('isolated D1 query returned no result');
 return rows;
}
function assertSchema(path){
 const required=['e2e_accounts','e2e_email_challenges','e2e_sessions',
  'e2e_staff_auth_attempts','e2e_staff_audit','e2e_registration_controls',
  'e2e_muse_audition_details','e2e_demo_2027_scores','e2e_january_demo_test_rosters'];
 const found=d1Rows("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'e2e_%'",path).map(row=>row.name);
 if(required.some(name=>!found.includes(name)))fail('isolated TEST schema incomplete; inspect migrations; deployment withheld');
 const col=d1Rows("SELECT name FROM pragma_table_info('e2e_muse_audition_details') WHERE name='contact_handle'",path);
 if(col.length!==1)fail('staff contact schema missing');
}

try{
  await writeFile(path,JSON.stringify(config,null,2),{flag:'wx'});
  const existing=d1Rows("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",path);
  if(existing.length!==1||!Number.isSafeInteger(Number(existing[0].n)))fail('unexpected isolated TEST D1 inventory');
  if(Number(existing[0].n)===0){
    for(const migration of migrations){
      wrangler(['d1','execute',DATABASE,'--remote','--file','backend/migrations/'+migration,'--yes','--json','--config',path]);
    }
    console.log('Fresh isolated TEST D1 migrations applied: '+migrations.length);
  }
  assertSchema(path);
  wrangler(['deploy','--config',path]);
  console.log('Isolated staff TEST deployed: '+WORKER+' (no production routes or databases)');
}finally{
  await unlink(path).catch(()=>{});
}
