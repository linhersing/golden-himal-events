import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {tmpdir} from 'node:os';
import {mkdtempSync,readFileSync,writeFileSync,existsSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createDecipheriv} from 'node:crypto';
import {securitySnapshot,monitorSecurity,evaluateSecuritySignals} from '../backend/security-monitor.js';
import {validateD1Export,encryptVerifiedExport} from '../scripts/secure-d1-export.mjs';
import {unsealAndVerify} from '../scripts/recover-d1-export.mjs';

const EMPTY_SIGNALS={staffRequestMax:0,staffVerifyMax:0,exhaustedChallenges:0,
  newChallenges:0,staffDenied:0,adminDeletes:0};

// Cloudflare D1 uses .bind().first(); SQLite's native local fixture uses .get().
const d1 = sqlite => ({prepare(sql){return {bind(...params){return {first:async()=>sqlite.prepare(sql).get(...params)}}}}});

function dbFixture(){
 const db=new DatabaseSync(':memory:');
 db.exec("CREATE TABLE e2e_staff_auth_attempts(kind TEXT,source_fingerprint TEXT,created_at INTEGER);"+
  "CREATE TABLE e2e_email_challenges(id TEXT,created_at INTEGER,attempts INTEGER);"+
  "CREATE TABLE e2e_staff_audit(id TEXT,occurred_at INTEGER,action TEXT,result TEXT);");
 return db;
}

test('read-only anomaly telemetry flags repeated staff attempts and omits all identities',async()=>{
 const db=dbFixture(),now=1800000000,source='private-source-fingerprint';
 try{
  for(let i=0;i<11;i++)db.prepare('INSERT INTO e2e_staff_auth_attempts VALUES(?,?,?)').run('request',source,now-30);
  for(let i=0;i<19;i++)db.prepare('INSERT INTO e2e_staff_auth_attempts VALUES(?,?,?)').run('verify',source,now-30);
  for(let i=0;i<5;i++)db.prepare('INSERT INTO e2e_email_challenges VALUES(?,?,?)').run('otp-'+i,now-30,5);
  for(let i=0;i<6;i++)db.prepare('INSERT INTO e2e_staff_audit VALUES(?,?,?,?)').run('deny-'+i,now-30,'audit_read','denied');
  const report=await securitySnapshot(d1(db),now);
  assert.equal(report.status,'attention');
  assert.deepEqual(report.alerts,['staff_request_burst','staff_verify_burst','otp_guessing_pattern','staff_authorization_denials']);
  assert.equal(report.metrics.staffRequestMax,11);
  assert.equal(report.metrics.staffVerifyMax,19);
  assert.doesNotMatch(JSON.stringify(report),/private-source-fingerprint|otp-1|deny-1/i);
  const recorded=db.prepare('SELECT COUNT(*) AS n FROM e2e_staff_audit').get().n;
  const attempts=db.prepare('SELECT COUNT(*) AS n FROM e2e_staff_auth_attempts').get().n;
  assert.equal(recorded,6);assert.equal(attempts,30);
 }finally{db.close()}
});

test('anomaly thresholds ignore old data and normal traffic',async()=>{
 const db=dbFixture(),now=1800000000;
 try{
  db.prepare('INSERT INTO e2e_staff_auth_attempts VALUES(?,?,?)').run('request','old-source',now-700);
  assert.deepEqual((await securitySnapshot(d1(db),now)).alerts,[]);
  assert.deepEqual(evaluateSecuritySignals(EMPTY_SIGNALS),[]);
  assert.deepEqual(evaluateSecuritySignals({...EMPTY_SIGNALS,newChallenges:100,adminDeletes:10}),
    ['otp_request_volume','admin_bulk_change_review']);
 }finally{db.close()}
});

test('monitor disabled by default and schema errors show sanitized unavailable',async()=>{
 const messages=[];
 const logger={info:s=>messages.push(s),warn:s=>messages.push(s),error:s=>messages.push(s)};
 const disabled=await monitorSecurity({},logger,1800000000);
 assert.equal(disabled.status,'disabled');assert.equal(messages.length,0);
 const failed=await monitorSecurity({STAGING_SECURITY_MONITOR_ENABLED:'true',E2E_DB:d1(dbFixture())},logger,1800000000);
 assert.equal(failed.status,'ok');
 const fallback=await monitorSecurity({STAGING_SECURITY_MONITOR_ENABLED:'true',E2E_DB:null},logger,1800000000);
 assert.deepEqual(fallback.alerts,['security_monitor_unavailable']);
 assert.doesNotMatch(messages.join(' '),/SELECT|secret|email|source_fingerprint/i);
});

const goodSQL="BEGIN TRANSACTION;"+
  "CREATE TABLE e2e_accounts(id TEXT PRIMARY KEY);"+
  "CREATE TABLE e2e_applications(id TEXT PRIMARY KEY);"+
  "CREATE TABLE e2e_email_challenges(id TEXT PRIMARY KEY);"+
  "CREATE TABLE e2e_staff_audit(id TEXT PRIMARY KEY);"+
  "INSERT INTO e2e_accounts VALUES('TEST-ACCOUNT-1');"+
  "INSERT INTO e2e_applications VALUES('TEST-APP-1');"+
  "COMMIT;";

test('encrypted backup passes actual SQLite restore, integrity and count checks',()=>{
 const key=Buffer.alloc(32,0x35),source=Buffer.from(goodSQL,'utf8');
 const result=encryptVerifiedExport(source,key);
 assert.equal(result.manifest.restore_rehearsal,'PASS');
 assert.equal(result.manifest.row_counts.e2e_accounts,1);
 assert.equal(result.manifest.row_counts.e2e_applications,1);
 assert.equal(result.sealed.subarray(0,4).toString(),'GHV1');
 const decipher=createDecipheriv('aes-256-gcm',key,result.sealed.subarray(4,16));
 decipher.setAuthTag(result.sealed.subarray(16,32));
 const restored=Buffer.concat([decipher.update(result.sealed.subarray(32)),decipher.final()]);
 assert.deepEqual(restored,source);
 assert.deepEqual(validateD1Export(restored).counts,result.manifest.row_counts);
 assert.doesNotMatch(JSON.stringify(result.manifest),/TEST-ACCOUNT|TEST-APP/i);
 assert.throws(()=>encryptVerifiedExport(Buffer.from('CREATE TABLE x(a);'),key),/missing_required_e2e_tables/);
 assert.throws(()=>encryptVerifiedExport(Buffer.from('NOT SQL'),key));
});

test('backup CLI requires key, writes encrypted-only output, and will not overwrite',()=>{
 const dir=mkdtempSync(join(tmpdir(),'ghv-sec-'));
 try{
  const input=join(dir,'fixture.sql'),encrypted=join(dir,'data.enc'),manifest=join(dir,'manifest.json');
  writeFileSync(input,goodSQL);
  const command=[new URL('../scripts/secure-d1-export.mjs',import.meta.url).pathname,input,encrypted,manifest];
  const env={...process.env};delete env.GHV_D1_BACKUP_KEY_HEX;
  const blocked=spawnSync(process.execPath,command,{env,encoding:'utf8'});
  assert.notEqual(blocked.status,0);
  assert.equal(existsSync(encrypted),false);
  const passed=spawnSync(process.execPath,command,{env:{...env,GHV_D1_BACKUP_KEY_HEX:'35'.repeat(32)},encoding:'utf8'});
  assert.equal(passed.status,0,passed.stderr);
  assert.equal(JSON.parse(readFileSync(manifest,'utf8')).restore_rehearsal,'PASS');
  assert.equal(readFileSync(encrypted).subarray(0,4).toString(),'GHV1');
  assert.notEqual(spawnSync(process.execPath,command,{env:{...env,GHV_D1_BACKUP_KEY_HEX:'35'.repeat(32)}}).status,0);
 }finally{rmSync(dir,{recursive:true,force:true})}
});


test('tampering and wrong key cannot reveal D1 SQL',()=>{
 const source=Buffer.from(goodSQL,'utf8');
 const key=Buffer.alloc(32,0x44),other=Buffer.alloc(32,0x55);
 const {sealed}=encryptVerifiedExport(source,key);
 assert.deepEqual(unsealAndVerify(sealed,key),source);
 assert.throws(()=>unsealAndVerify(sealed,other));
 const changed=Buffer.from(sealed);changed[changed.length-1]^=1;
 assert.throws(()=>unsealAndVerify(changed,key));
 assert.throws(()=>unsealAndVerify(Buffer.from('plaintext'),key));
});

test('recovery CLI restores to private destination without overwriting or printing applicant rows',()=>{
 const dir=mkdtempSync(join(tmpdir(),'ghv-recovery-'));
 try{
  const encrypted=join(dir,'data.enc'),output=join(dir,'restored.sql');
  const keyHex='46'.repeat(32),key=Buffer.from(keyHex,'hex');
  writeFileSync(encrypted,encryptVerifiedExport(Buffer.from(goodSQL),key).sealed);
  const command=[new URL('../scripts/recover-d1-export.mjs',import.meta.url).pathname,encrypted,output];
  const env={...process.env,GHV_D1_BACKUP_KEY_HEX:keyHex};
  const pass=spawnSync(process.execPath,command,{env,encoding:'utf8'});
  assert.equal(pass.status,0,pass.stderr);
  assert.equal(readFileSync(output,'utf8'),goodSQL);
  assert.doesNotMatch(pass.stdout,/TEST-ACCOUNT|TEST-APP/i);
  const retry=spawnSync(process.execPath,command,{env,encoding:'utf8'});
  assert.notEqual(retry.status,0);
 }finally{rmSync(dir,{force:true,recursive:true})}
});
