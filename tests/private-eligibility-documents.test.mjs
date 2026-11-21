import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker from '../backend/eligibility-test-worker.js';
import {cleanupEligibility} from '../backend/eligibility-documents.js';

import {applicationId,envVars,files,png,request,seed} from './fixtures/private-eligibility-fixtures.mjs';

function make(){
 const sqlite=new DatabaseSync(':memory:');
 sqlite.exec('PRAGMA foreign_keys=ON');
 for(const file of files)sqlite.exec(readFileSync(new URL('../backend/migrations/'+file,import.meta.url),'utf8'));
 for(const [sql,values] of seed)sqlite.prepare(sql).run(...values);
 const db={prepare(sql){
  let values=[];return {bind(...input){values=input;return this},first(){return sqlite.prepare(sql).get(...values)},all(){return {results:sqlite.prepare(sql).all(...values)}},
   run(){return {meta:{changes:sqlite.prepare(sql).run(...values).changes}}}};
 }};
 const objects=new Map(),r2={
  async put(key,bytes){if(objects.has(key))return null;objects.set(key,bytes);return {size:bytes.byteLength};},
  async head(key){const value=objects.get(key);return value?{size:value.byteLength}:null;},
  async get(key){const value=objects.get(key);return value?{size:value.byteLength,body:value}:null;},
  async delete(key){objects.delete(key);},
  async list(){return {objects:Array.from(objects.keys(),key=>({key,uploaded:new Date()})),truncated:false};}
 };
 const env={...envVars,ELIGIBILITY_TEST_D1:db,ELIGIBILITY_TEST_R2:r2};
 return {sqlite,db,env,r2,objects,send:(path,options)=>worker.fetch(request(path,options),env)};
}

test('synthetic flow restricts access and never exposes a storage key',async()=>{
 const {sqlite,env,send,objects}=make();
 try{
  assert.equal((await send('',{role:null})).status,401);
  assert.equal((await send('',{role:'other'})).status,404);
  assert.equal((await send('/download',{role:'reviewer'})).status,403);
  assert.equal((await send('',{host:'https://formal.example.invalid'})).status,404);
  env.ELIGIBILITY_TEST_MODE='';assert.equal((await send('',{method:'PUT',body:png})).status,404);env.ELIGIBILITY_TEST_MODE='synthetic';
  assert.equal((await send('',{method:'PUT',body:png,origin:'https://other.example.invalid'})).status,403);
  assert.equal((await send('',{method:'PUT',body:png,role:'other'})).status,404);
  assert.equal((await send('',{method:'PUT',body:png,role:'organizer'})).status,403);
  assert.equal((await send('',{method:'PUT',body:png,type:'text/html'})).status,415);
  assert.equal((await send('',{method:'PUT',body:png.slice(0,10)})).status,415);
  assert.equal((await send('',{method:'PUT',body:new Uint8Array(5*1024*1024+1)})).status,413);
  assert.equal(objects.size,0);
  const key=crypto.randomUUID();
  const upload=await send('',{method:'PUT',body:png,key});
  assert.equal(upload.status,201,await upload.clone().text());const {document}=await upload.json();
  assert.equal((await send('',{method:'PUT',body:png,key})).status,200);
  assert.equal(objects.size,1);
  const status=await (await send('')).json();assert.deepEqual(status.document,document);
  assert.doesNotMatch(JSON.stringify(status),/object_key|eligibility-private\//);
  const download=await send('/download',{role:'organizer'});
  assert.equal(download.status,200);assert.match(download.headers.get('content-disposition'),/^attachment/);
  assert.equal(download.headers.get('x-content-type-options'),'nosniff');
  assert.deepEqual(new Uint8Array(await download.arrayBuffer()),png);
  assert.equal((await send('/download',{role:'other'})).status,404);
  assert.equal((await send('',{method:'PUT',body:png})).status,409);
 }finally{sqlite.close()}
});

test('journal survives write/delete failures, retires old versions and expires files',async()=>{
 const {sqlite,env,send,r2,objects}=make();
 try{
  const now=Math.floor(Date.now()/1000);
  const put=r2.put.bind(r2);
  const key=crypto.randomUUID();
  r2.put=async(...args)=>{await put(...args);throw Error('simulated ambiguous storage result');};
  assert.equal((await send('',{method:'PUT',body:png,key})).status,503);
  r2.put=put;
  const initial=await send('',{method:'PUT',body:png,key});assert.equal(initial.status,201);
  const revision=(await initial.json()).document.revision;
  const outcomes=await Promise.all([send('',{method:'PUT',body:png,revision}),send('',{method:'PUT',body:png,revision})]);
  assert.deepEqual(outcomes.map(x=>x.status).sort(),[201,409]);
  const current=(await (await send('')).json()).document;
  assert.notEqual(current.revision,revision);
  const remove=r2.delete.bind(r2);
  r2.delete=async()=>{throw Error('temporary R2 delete failure')};
  await cleanupEligibility(env,now+30);
  assert.ok(objects.size>=2);
  r2.delete=remove;
  await cleanupEligibility(env,now+61);assert.equal(objects.size,1);
  const revoked=await send('',{method:'DELETE',revision:current.revision});
  assert.equal(revoked.status,200);assert.equal((await send('/download')).status,404);
  await cleanupEligibility(env,now+31);assert.equal(objects.size,0);
  assert.equal((await send('',{method:'PUT',body:png})).status,201);
  await cleanupEligibility(env,now+310);assert.equal(objects.size,0);
  assert.equal((await send('/download')).status,404);
  assert.equal((await send('',{method:'PUT',body:png})).status,201);
  sqlite.prepare('DELETE FROM e2e_applications WHERE id=?').run(applicationId);
  assert.equal((await send('/download')).status,404);
  await cleanupEligibility(env,now+311);assert.equal(objects.size,0);
 }finally{sqlite.close()}
});

test('confirmed D1 state survives an unacknowledged commit; proof is tied to an approved application',async()=>{
 const {sqlite,db,send,objects}=make();
 try{
  sqlite.exec('DELETE FROM e2e_test_application_approvals');
  assert.equal((await send('',{method:'PUT',body:png})).status,409);
  assert.equal(objects.size,0);
  sqlite.prepare('INSERT INTO e2e_test_application_approvals VALUES(?,?,?)').run(applicationId,'fictional-organizer',1);
  const prepare=db.prepare;
  db.prepare=function(sql){
   const statement=prepare(sql);
   if(!sql.includes("SET state='current' WHERE id="))return statement;
   const run=statement.run;
   statement.run=()=>{run();throw Error('synthetic timeout after durable D1 commit');};
   return statement;
  };
  const key=crypto.randomUUID();
  assert.equal((await send('',{method:'PUT',body:png,key})).status,503);
  db.prepare=prepare;
  const retry=await send('',{method:'PUT',body:png,key});
  assert.equal(retry.status,200);
  const {document}=await retry.json();
  assert.equal(sqlite.prepare("SELECT id FROM e2e_private_eligibility_objects WHERE state='current'").get().id,document.revision);
  assert.equal(objects.size,1);
  const alternate=png.slice();alternate[30]^=1;
  assert.equal((await send('',{method:'PUT',body:alternate,key})).status,409);
  assert.equal((await send('',{method:'DELETE',revision:crypto.randomUUID()})).status,409);
  assert.equal((await send('/download')).status,200);
 }finally{sqlite.close()}
});

test('PDF active-content marker and a declared MIME mismatch stay outside D1 and R2',async()=>{
 const {sqlite,send,objects}=make();
 try{
  const bytes=new TextEncoder().encode('%PDF-1.4\n1 0 obj <</Type /Catalog /OpenAction 2 0 R>> endobj\n%%EOF');
  assert.equal((await send('',{method:'PUT',body:bytes,type:'application/pdf'})).status,415);
  assert.equal((await send('',{method:'PUT',body:png,type:'image/jpeg'})).status,415);
  assert.equal(objects.size,0);
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM e2e_private_eligibility_objects').get().n,0);
 }finally{sqlite.close()}
});

test('withdrawal signals a conflict while the first upload is staged',async()=>{
 const {sqlite,r2,send}=make();
 let signal,release;
 const started=new Promise(resolve=>{signal=resolve});
 const proceed=new Promise(resolve=>{release=resolve});
 const put=r2.put;
 r2.put=async(...args)=>{signal();await proceed;return put(...args)};
 const upload=send('',{method:'PUT',body:png});
 try{
  await started;
  assert.equal((await send('',{method:'DELETE',revision:'none'})).status,409);
 }finally{
  release();
  await upload;
  sqlite.close();
 }
});

test('cleanup makes progress behind failed deletions and removes aged untracked objects only',async()=>{
 const {sqlite,env,r2,objects}=make();
 try{
  const now=Math.floor(Date.now()/1000);
  const queue=sqlite.prepare(`INSERT INTO e2e_private_eligibility_objects
   VALUES(?,?,?,'none',?,NULL,'image/png',?,'removed',0,0,?)`);
  for(let i=0;i<51;i++){
   const key='eligibility-private/fixture-'+i;
   queue.run('row-'+i,applicationId,'request-'+i,key,png.length,i===50?1:0);
   objects.set(key,png);
  }
  const orphan='eligibility-private/aged-orphan',fresh='eligibility-private/fresh';
  objects.set(orphan,png);objects.set(fresh,png);
  const del=r2.delete;
  r2.delete=async key=>{if(key.includes('fixture-')&&!key.endsWith('-50'))throw Error('synthetic failure');await del(key);};
  const list=r2.list;
  r2.list=async()=>{
   const results=await list();
   for(const object of results.objects)if(object.key===orphan)object.uploaded=new Date((now-1801)*1000);
   return results;
  };
  await cleanupEligibility(env,now);
  assert.equal(objects.has(orphan),false);
  assert.equal(objects.has(fresh),true);
  assert.equal(objects.has('eligibility-private/fixture-50'),true);
  await cleanupEligibility(env,now+1);
  assert.equal(objects.has('eligibility-private/fixture-50'),false);
  assert.equal(objects.has(fresh),true);
 }finally{sqlite.close()}
});
