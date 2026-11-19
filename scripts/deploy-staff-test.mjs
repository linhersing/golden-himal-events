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
try{
  await writeFile(path,JSON.stringify(config,null,2),{flag:'wx'});
  wrangler(['deploy','--config',path]);
  console.log('Isolated staff TEST deployed: '+WORKER+' (no production routes or databases)');
}finally{
  await unlink(path).catch(()=>{});
}
