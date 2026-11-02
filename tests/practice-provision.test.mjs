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
test('successful SQL file import with progress output still verifies actual schema and preserved rows',()=>{
 const root=mkdtempSync(join(tmpdir(),'ghv-provision-output-')),script=resolve('scripts/provision-practice.mjs');
 try{
  mkdirSync(join(root,'bin'));mkdirSync(join(root,'backend/migrations'),{recursive:true});
  copyFileSync('backend/migrations/1002_private_practice_ONLY.sql',join(root,'backend/migrations/1002_private_practice_ONLY.sql'));
  const cli=`#!/usr/bin/env node
import {DatabaseSync} from 'node:sqlite';import {readFileSync} from 'node:fs';
const args=process.argv.slice(2),db=new DatabaseSync('service.db');
db.exec("CREATE TABLE IF NOT EXISTS e2e_accounts(id TEXT PRIMARY KEY);CREATE TABLE IF NOT EXISTS e2e_applications(id TEXT PRIMARY KEY);INSERT OR IGNORE INTO e2e_accounts VALUES('existing-account');INSERT OR IGNORE INTO e2e_applications VALUES('existing-application');");
if(args.includes('time-travel'))console.log(JSON.stringify({bookmark:'TEST-RESTORE-BOOKMARK'}));
else if(args.includes('--file')){db.exec(readFileSync(args[args.indexOf('--file')+1],'utf8'));console.log('Executing SQL file against remote database. Success.');}
else{const sql=args[args.indexOf('--command')+1];console.log(JSON.stringify([{success:true,results:db.prepare(sql).all()}]));}
db.close();`;
  writeFileSync(join(root,'bin/npx'),cli,{mode:0o755});
  const r=spawnSync(process.execPath,[script],{cwd:root,env:{...process.env,PATH:join(root,'bin')+':'+process.env.PATH,WORKERS_CI:'1',WORKERS_CI_BRANCH:'codex/initial-site',WORKERS_CI_COMMIT_SHA:'a'.repeat(40)},encoding:'utf8'});
  assert.equal(r.status,0);const evidence=JSON.parse(readFileSync(join(root,'dist/practice-build.json'),'utf8'));
  assert.equal(evidence.status,'PASS');assert.deepEqual(evidence.before,{accounts:1,applications:1});assert.deepEqual(evidence.after,evidence.before);assert.deepEqual(evidence.schema,{tables:9,triggers:12});
 }finally{rmSync(root,{recursive:true,force:true})}
});
