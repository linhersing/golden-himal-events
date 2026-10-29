import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import worker from '../backend/staging-registration-worker.js';
import {readFile} from 'node:fs/promises';

const host='https://golden-himal-voice-preview.linhersing.workers.dev';
function setup(){
  const db=new DatabaseSync(':memory:');
  db.exec("CREATE TABLE ghv_test_registrations ("+
    "id INTEGER PRIMARY KEY AUTOINCREMENT,"+
    "display_name TEXT NOT NULL,"+
    "category TEXT NOT NULL CHECK(category IN ('university','community')),"+
    "round_code TEXT NOT NULL,"+
    "status TEXT NOT NULL DEFAULT 'pending',"+
    "created_at TEXT NOT NULL DEFAULT (datetime('now')))");
  const binding={prepare(sql){
    let params=[];
    return {
      bind(...args){params=args;return this},
      first(){return db.prepare(sql).get(...params)||null},
      run(){const x=db.prepare(sql).run(...params);return {meta:{changes:x.changes}}}
    };
  }};
  const env={DB:binding,STAGING_TEST_WRITE_ENABLED:'false',
    ASSETS:{fetch:async()=>new Response('static-asset')}};
  return {db,env};
}
const req=(path,body,origin=host)=>new Request(host+path,{method:'POST',
  headers:{Origin:origin,'Content-Type':'application/json'},
  body:JSON.stringify(body)});

test('Worker retains static pages and rejects other API paths',async()=>{
  const {db,env}=setup();
  try {
    const staticPage=await worker.fetch(new Request(host+'/'),env);
    assert.equal(await staticPage.text(),'static-asset');
    const unknown=await worker.fetch(new Request(host+'/api/vote/confirm'),env);
    assert.equal(unknown.status,404);
  }finally{db.close()}
});
test('health verifies binding and table but discloses no personal data',async()=>{
  const {db,env}=setup();
  try{
    const res=await worker.fetch(new Request(host+'/api/staging/health'),env);
    assert.deepEqual(await res.json(),{ok:true,testOnly:true,tableReady:true,canWrite:false});
    assert.equal(res.headers.get('Cache-Control'),'no-store, max-age=0');
  }finally{db.close()}
});
test('synthetic write blocked unless enabled; rejects arbitrary PII and origin',async()=>{
 const {db,env}=setup();
 try{
  const payload={sample:'TEST-SINGER-API-001'};
  assert.equal((await worker.fetch(req('/api/staging/registration-test',payload),env)).status,503);
  env.STAGING_TEST_WRITE_ENABLED='true';
  assert.equal((await worker.fetch(req('/api/staging/registration-test',{sample:'A real name'}),env)).status,400);
  assert.equal((await worker.fetch(req('/api/staging/registration-test',{sample:payload.sample,email:'private@example.org'}),env)).status,400);
  assert.equal((await worker.fetch(req('/api/staging/registration-test',payload,'https://evil.example'),env)).status,403);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM ghv_test_registrations').get().n,0);
 }finally{db.close()}
});
test('synthetic POST writes at most one fixed row across 20 retries',async()=>{
 const {db,env}=setup();
 try{
  env.STAGING_TEST_WRITE_ENABLED='true';
  const payload={sample:'TEST-SINGER-API-001'};
  for(let i=0;i<20;i++){
    const response=await worker.fetch(req('/api/staging/registration-test',payload),env);
    assert.equal(response.status,200);
    const data=await response.json();
    assert.equal(data.testOnly,true);
    assert.equal(data.stored.display_name,payload.sample);
    assert.equal(data.stored.status,'pending');
  }
  assert.equal(db.prepare('SELECT COUNT(*) n FROM ghv_test_registrations').get().n,1);
 }finally{db.close()}
});
test('Wrangler configuration binds staging only with writes disabled',async()=>{
 const cfg=JSON.parse(await readFile(new URL('../wrangler.jsonc',import.meta.url),'utf8'));
 assert.equal(cfg.main,'./backend/staging-registration-worker.js');
 assert.equal(cfg.d1_databases[0].database_name,'ghv-staging');
 assert.equal(cfg.d1_databases[0].binding,'DB');
 assert.equal(cfg.vars.STAGING_TEST_WRITE_ENABLED,'false');
 assert.deepEqual(cfg.assets.run_worker_first,['/api/staging/*']);
 assert.equal(JSON.stringify(cfg).includes('backend/src/index.js'),false);
});


test('read-only D1 sample route returns exactly the fictional record',async()=>{
 const {db,env}=setup();
 try {
  db.prepare('INSERT INTO ghv_test_registrations(display_name,category,round_code) VALUES (?,?,?)')
   .run('TEST-SINGER-001','university','2027-03');
  const response=await worker.fetch(new Request(host+'/api/staging/sample-read'),env);
  assert.equal(response.status,200);
  const data=await response.json();
  assert.deepEqual(data,{ok:true,testOnly:true,source:'d1-staging',sample:{
   id:1,display_name:'TEST-SINGER-001',category:'university',
   round_code:'2027-03',status:'pending'
  }});
  assert.equal(response.headers.get('Cache-Control'),'no-store, max-age=0');
  const wrongMethod=await worker.fetch(req('/api/staging/sample-read',{}),env);
  assert.equal(wrongMethod.status,405);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM ghv_test_registrations').get().n,1);
 }finally{db.close()}
});
test('read-only sample route fails closed without DB binding or fixture',async()=>{
 const {db,env}=setup();
 try{
  assert.equal((await worker.fetch(new Request(host+'/api/staging/sample-read'),env)).status,404);
  delete env.DB;
  assert.equal((await worker.fetch(new Request(host+'/api/staging/sample-read'),env)).status,503);
 }finally{db.close()}
});


test('synthetic CI row remains readable after write endpoint is removed',async()=>{
 const {db,env}=setup();
 try{
  db.prepare('INSERT INTO ghv_test_registrations(display_name,category,round_code) VALUES (?,?,?)')
    .run('TEST-SINGER-API-001','university','2027-03');
  const read=await worker.fetch(new Request(host+'/api/staging/ci-read'),env);
  assert.equal(read.status,200);
  const result=await read.json();
  assert.equal(result.testOnly,true);
  assert.equal(result.sample.display_name,'TEST-SINGER-API-001');
  assert.equal(result.sample.category,'university');
  const forbidden=await worker.fetch(req('/api/staging/ci-fixture-write',{}),env);
  assert.equal(forbidden.status,404);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM ghv_test_registrations').get().n,1);
 }finally{db.close()}
});
