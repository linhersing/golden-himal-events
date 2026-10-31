import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';
import worker from '../backend/staging-registration-worker.js';
const url='https://golden-himal-voice-preview.linhersing.workers.dev/api/staging/architecture-preview';
function adapter(db){return {prepare(sql){let args=[];return {bind(...xs){args=xs;return this},async all(){return {results:db.prepare(sql).all(...args)}}}}}}
test('architecture preview fails honestly when its real D1 fixture is unavailable',async()=>{
 const r=await worker.fetch(new Request(url),{});assert.equal(r.status,503);
 assert.deepEqual(await r.json(),{ok:false,error:'architecture_preview_not_configured'});
});
test('public architecture preview has no write or registration endpoint',async()=>{
 for(const method of ['POST','PUT','DELETE']){
  const r=await worker.fetch(new Request(url,{method}),{});assert.equal(r.status,405);
 }
});
test('architecture preview reads only dedicated fictional D1 records and keeps email/payment deferred',async()=>{
 const db=new DatabaseSync(':memory:');
 try{
  const sql=await readFile(new URL('../backend/migrations/1001_architecture_preview_ONLY.sql',import.meta.url),'utf8');
  db.exec(sql);db.exec(sql); // Idempotent, never replaces existing rows.
  const env={E2E_DB:adapter(db),DB:{prepare(){throw Error('legacy database must not be touched')}}};
  const response=await worker.fetch(new Request(url),env);assert.equal(response.status,200);
  const data=await response.json();assert.equal(data.testOnly,true);assert.equal(data.readOnly,true);
  assert.equal(data.source,'cloudflare-d1-fictional-preview');assert.equal(data.profiles.length,6);assert.equal(data.applications.length,2);
  assert.equal(data.scores.length,18);assert.deepEqual(data.applications.map(a=>a.round_code),['2027-01','2027-04']);assert.equal(data.deferred.emailVerification,true);assert.equal(data.deferred.realRegistrationFee,true);
  const maya=data.standings.find(x=>x.id==='DEMO-GHV-001');assert.equal(maya.judges_mean,80);assert.equal(maya.vote_score,60);assert.equal(maya.total_score,69.8);
  assert.equal(data.authenticated,false);assert.equal(data.registeredMembersCreated,false);
  assert(!JSON.stringify(data).includes('@'));assert(!JSON.stringify(data).includes('password'));
  assert.equal((await worker.fetch(new Request(url.replace('/api/staging/architecture-preview','/api/e2e/me')),env)).status,503);
 }finally{db.close()}
});
