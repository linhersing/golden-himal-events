import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';
import worker from '../backend/staging-registration-worker.js';
const base='https://golden-himal.example';
const mgr=path=>base+'/api/staging/management/'+path;
function adapter(db){return {prepare(sql){let args=[];const o={bind(...xs){args=xs;return o},
 async first(){return db.prepare(sql).get(...args)||null},
 async all(){return {results:db.prepare(sql).all(...args)}},
 async run(){return {meta:{changes:Number(db.prepare(sql).run(...args).changes)}}};return o},
 async batch(stmts){db.exec('BEGIN');try{const r=[];for(const s of stmts)r.push(await s.run());db.exec('COMMIT');return r}catch(e){db.exec('ROLLBACK');throw e}}};}
async function fixture(){
 const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');
 db.exec(await readFile(new URL('../backend/migrations/1002_private_practice_ONLY.sql',import.meta.url),'utf8'));
 const env={E2E_DB:adapter(db),STAGING_PRACTICE_ENABLED:'true',
  GHV_MANAGEMENT_ENABLED:'true',
  GHV_ADMIN_TEAM_DOMAIN:'https://ghv-test.cloudflareaccess.com',
  GHV_ADMIN_ACCESS_AUD:'unique-test-admin-aud',
  GHV_ADMIN_EMAILS:'approved@example.invalid'};
 const admin={access:{aud:'unique-test-admin-aud',getIdentity:async()=>({email:'approved@example.invalid'})}};
 const call=async(path,method='GET',ctx=admin,headers={})=>{
  const res=await worker.fetch(new Request(mgr(path),{method,headers}),env,ctx);
  return {status:res.status,data:await res.json()}
 };
 const practice=async(path,body,cookie='')=>{
  const res=await worker.fetch(new Request(base+'/api/staging/practice/'+path,{
   method:body?'POST':'GET',headers:{Origin:base,'Content-Type':'application/json',Cookie:cookie},
   body:body?JSON.stringify(body):undefined}),env);
  return {status:res.status,data:await res.json(),cookie:res.headers.get('set-cookie')?.split(';')[0]||''};
 };
 return {db,env,call,practice,admin};
}
const sample={synthetic:true,contact_phone:'+9770000000000',contact_handle:'TEST',
 affiliation:'TEST University',song_language:'Nepali',song_key:'C',priority_ack:true,
 media_ack:true,stage_name:'SYNTHETIC MEMBER',round_code:'2027-01',category:'university',
 province:'bagmati',song_title:'TEST',original_artist:'TEST',
 work_url:'https://youtu.be/dQw4w9WgXcQ'};
test('private management requires configured Access and approved identity; spoofed plain headers never work',async()=>{
 const f=await fixture();try{
  assert.equal((await f.call('overview', 'GET',undefined)).status,403);
  assert.equal((await f.call('overview','GET',undefined,{'X-Admin':'true',
   'Cf-Access-Authenticated-User-Email':'approved@example.invalid'})).status,403);
  assert.equal((await f.call('overview','GET',{access:{aud:'wrong-audience',
   getIdentity:async()=>({email:'approved@example.invalid'})}})).status,403);
  assert.equal((await f.call('overview','GET',{access:{aud:'unique-test-admin-aud',
   getIdentity:async()=>({email:'other@example.invalid'})}})).status,403);
  assert.equal((await f.call('overview','POST')).status,405);
  f.env.GHV_MANAGEMENT_ENABLED='false';
  assert.equal((await f.call('overview')).status,503);
  f.env.GHV_MANAGEMENT_ENABLED='true';
  assert.equal((await f.call('overview')).status,200);
 }finally{f.db.close()}
});
test('global D1 admin overview includes all active synthetic workspaces but excludes expired and personal data',async()=>{
 const f=await fixture();try{
  const first=await f.practice('create',{synthetic:true});
  assert.equal(first.status,201);
  let r=await f.practice('application',sample,first.cookie);assert.equal(r.status,201);
  const firstId=r.data.application.id;
  r=await f.practice('application',{...sample,round_code:'2027-04'},first.cookie);
  assert.equal(r.status,201);
  const second=await f.practice('create',{synthetic:true});
  assert.equal(second.status,201);
  r=await f.practice('application',{...sample,stage_name:'SECOND TEST'},second.cookie);
  assert.equal(r.status,201);
  const result=await f.call('overview');
  assert.equal(result.status,200);
  assert.equal(result.data.actual_payments.status,'NOT_CONNECTED');
  assert.equal(result.data.actual_payments.paid_count,null);
  const stats=result.data.sources.practice.counts;
  assert.equal(stats.active_workspaces,2);
  assert.equal(stats.distinct_test_identities,2);
  assert.equal(stats.applications,3);
  assert.equal(stats.january,2);
  assert.equal(stats.april,1);
  assert.equal(stats.mock_unpaid,3);
  assert.equal(stats.mock_paid,0);
  assert.equal(result.data.sources.e2e.status,'not_configured');
  assert(!JSON.stringify(result.data).includes('contact_phone'));
  const records=await f.call('records?source=practice&page=1');
  assert.equal(records.status,200);
  assert.equal(records.data.total,3);
  assert.equal(records.data.items.length,3);
  assert(records.data.items.some(x=>x.record_id===firstId));
  assert(records.data.items.every(x=>x.real_payment===false));
  assert(!JSON.stringify(records.data).includes('+977'));
  assert.equal((await f.call('records?source=illegal')).status,400);
  assert.equal((await f.call('records?page=-1')).status,400);
  const sim=await f.practice('simulate-fee',{application_id:firstId},first.cookie);
  assert.equal(sim.status,200);
  const newResults=await f.call('overview');
  assert.equal(newResults.data.sources.practice.counts.mock_paid,1);
  assert.equal(newResults.data.sources.practice.counts.mock_unpaid,2);
  f.db.prepare('UPDATE ghv_practice_workspaces SET expires_at=1 WHERE id=?')
   .run(second.data.actor.workspace_id);
  const after=await f.call('overview');
  assert.equal(after.data.sources.practice.counts.active_workspaces,1);
  assert.equal(after.data.sources.practice.counts.applications,2);
 }finally{f.db.close()}
});
test('signed Access JWT is verified using exact team JWKS, audience, expiry and allowed mailbox',async()=>{
 const f=await fixture();
 const originalFetch=globalThis.fetch;
 try{
  const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,
   publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
  const jwk=await crypto.subtle.exportKey('jwk',pair.publicKey);jwk.kid='local-admin-test-key';jwk.use='sig';jwk.alg='RS256';
  globalThis.fetch=async url=>{
   assert.equal(url,'https://ghv-test.cloudflareaccess.com/cdn-cgi/access/certs');
   return new Response(JSON.stringify({keys:[jwk]}),{status:200});
  };
  const encode=input=>Buffer.from(input).toString('base64url');
  const sign=async(overrides={})=>{
   const now=Math.floor(Date.now()/1000);
   const parts=[encode(JSON.stringify({alg:'RS256',kid:jwk.kid,typ:'JWT'})),
    encode(JSON.stringify({iss:'https://ghv-test.cloudflareaccess.com',type:'app',
     aud:['unique-test-admin-aud'],iat:now,exp:now+900,email:'approved@example.invalid',...overrides}))];
   const signature=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,
    new TextEncoder().encode(parts.join('.')));
   return [...parts,encode(signature)].join('.');
  };
  const good=await sign();
  assert.equal((await f.call('overview','GET',undefined,{'Cf-Access-Jwt-Assertion':good})).status,200);
  assert.equal((await f.call('overview','GET',undefined,{'Cf-Access-Jwt-Assertion':await sign({aud:['other']})})).status,403);
  assert.equal((await f.call('overview','GET',undefined,{'Cf-Access-Jwt-Assertion':await sign({exp:1})})).status,403);
  assert.equal((await f.call('overview','GET',undefined,{'Cf-Access-Jwt-Assertion':await sign({email:'forbidden@example.invalid'})})).status,403);
  assert.equal((await f.call('overview','GET',undefined,{'Cf-Access-Jwt-Assertion':good.slice(0,-10)+'1234567890'})).status,403);
 }finally{globalThis.fetch=originalFetch;f.db.close()}
});
