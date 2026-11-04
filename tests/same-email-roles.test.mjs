import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';
import {handleE2E} from '../backend/staging-e2e.js';
const host='https://example.invalid';
const post=(path,body,cookie)=>new Request(host+'/api/e2e/'+path,{method:'POST',headers:{Origin:host,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body)});
const get=(path,cookie)=>new Request(host+'/api/e2e/'+path,{headers:{Cookie:cookie}});
async function fixture(){
 const db=new DatabaseSync(':memory:');db.exec(await readFile(new URL('../backend/migrations/1000_e2e_staging_acceptance_ONLY.sql',import.meta.url),'utf8'));
 const inbox=[],env={STAGING_E2E_ENABLED:'true',STAGING_IDENTITY_SECRET:'T'.repeat(64),STAGING_FROM_EMAIL:'test@example.invalid',STAGING_ALLOWED_EMAILS:'owner@example.invalid,member@example.invalid',STAGING_ORGANIZER_EMAILS:'owner@example.invalid',STAGING_REVIEWER_EMAILS:'owner@example.invalid,judge@example.invalid',EMAIL:{async send(m){inbox.push(m)}},DB:{prepare(sql){let args=[];return {bind(...v){args=v;return this},first(){return db.prepare(sql).get(...args)||null},all(){return {results:db.prepare(sql).all(...args)}},run(){return {meta:{changes:db.prepare(sql).run(...args).changes}}}}}}};
 async function start(email,role){const r=await handleE2E(post('request-code',{email,role}),env);assert.equal(r.status,200);return {...await r.json(),code:inbox.at(-1).text.match(/\b\d{6}\b/)[0]}}
 async function verify(c){return handleE2E(post('verify-code',{challenge_id:c.challenge_id,code:c.code}),env)}
 async function auth(email,role){const r=await verify(await start(email,role));assert.equal(r.status,200,await r.clone().text());return {cookie:r.headers.get('set-cookie').split(';')[0],...await r.json()}}
 return {db,env,start,verify,auth};
}
test('one exact email logs into three isolated roles without changing the original member',async()=>{
 const f=await fixture();try{
  const member=await f.auth('owner@example.invalid','member');
  const org=await f.auth('owner@example.invalid','organizer');
  const judge=await f.auth('owner@example.invalid','reviewer');
  assert.equal(new Set([member.account_id,org.account_id,judge.account_id]).size,3);
  for(const [session,role] of [[member,'member'],[org,'organizer'],[judge,'reviewer']])assert.equal((await (await handleE2E(get('me',session.cookie),f.env)).json()).account.role,role);
  assert.equal(f.db.prepare('SELECT role FROM e2e_accounts WHERE id=?').get(member.account_id).role,'member');
  assert.equal((await handleE2E(get('organizer-queue',member.cookie),f.env)).status,403);
  assert.equal((await handleE2E(get('organizer-queue',judge.cookie),f.env)).status,403);
  assert.equal((await handleE2E(get('reviewer-queue',org.cookie),f.env)).status,403);
  assert.equal((await handleE2E(post('request-code',{email:'owner@example.invalid',role:'member'}),f.env)).status,429,'three role requests share one rate limit');
 }finally{f.db.close()}
});
test('staff login resolves server grants and switching cannot grant a missing role',async()=>{
 const f=await fixture();try{
  const org=await f.auth('owner@example.invalid','staff');assert.equal(org.role,'organizer');
  const changed=await handleE2E(post('switch-role',{role:'reviewer'},org.cookie),f.env);assert.equal(changed.status,200);
  const judgeCookie=changed.headers.get('set-cookie').split(';')[0];assert.equal((await (await handleE2E(get('me',judgeCookie),f.env)).json()).account.role,'reviewer');
  assert.equal((await handleE2E(get('me',org.cookie),f.env)).status,401,'switch rotates and revokes old session');
  const member=await f.auth('member@example.invalid','member');assert.equal((await handleE2E(post('switch-role',{role:'organizer'},member.cookie),f.env)).status,403);
  const judge=await f.auth('judge@example.invalid','staff');assert.equal(judge.role,'reviewer');assert.equal((await handleE2E(post('switch-role',{role:'organizer'},judge.cookie),f.env)).status,403);
  assert.equal((await handleE2E(post('switch-role',{role:'organizer'}),f.env)).status,401);
 }finally{f.db.close()}
});
test('revoked grants reject pending OTP and existing sessions',async()=>{
 const f=await fixture();try{
  const c=await f.start('owner@example.invalid','organizer');f.env.STAGING_ORGANIZER_EMAILS='';assert.equal((await f.verify(c)).status,403);
  f.env.STAGING_ORGANIZER_EMAILS='owner@example.invalid';const org=await f.auth('owner@example.invalid','organizer');f.env.STAGING_ORGANIZER_EMAILS='';assert.equal((await handleE2E(get('organizer-queue',org.cookie),f.env)).status,401);
 }finally{f.db.close()}
});
test('erasing a scoped member invalidates their pending member OTP',async()=>{
 const f=await fixture();try{
  await f.auth('owner@example.invalid','organizer');
  const member=await f.auth('owner@example.invalid','member');
  const pending=await f.start('owner@example.invalid','member');
  assert.equal((await handleE2E(post('delete-my-data',{},member.cookie),f.env)).status,200);
  assert.equal((await f.verify(pending)).status,401,'pending OTP cannot recreate erased member');
 }finally{f.db.close()}
});
test('the same mailbox reviewer cannot score its own singer identity',async()=>{
 const f=await fixture();try{
  const member=await f.auth('owner@example.invalid','member');
  const entry={round_code:'2027-01',category:'community',province:'gandaki',location_basis:'residence',affiliation:'TEST',stage_name:'TEST SINGER',song_title:'TEST SONG',original_artist:'TEST ARTIST',song_language:'Nepali',song_key:'C',demo_url:'https://youtu.be/dQw4w9WgXcQ',adult_confirmed:true,no_exclusive_contract:true};
  f.env.STAGING_SUBMISSION_MODE='links';
  const created=await handleE2E(post('applications',entry,member.cookie),f.env);assert.equal(created.status,201);const id=(await created.json()).application_id;
  await handleE2E(post('mock-payment',{application_id:id},member.cookie),f.env);
  const judge=await f.auth('owner@example.invalid','reviewer');
  const score=await handleE2E(post('score',{application_id:id,phase:'demo',technique:50,interpretation:30,no_conflict:true},judge.cookie),f.env);
  assert.equal(score.status,403);assert.equal((await score.json()).error,'self_review_disallowed');
  assert.equal(f.db.prepare('SELECT COUNT(*) n FROM e2e_judge_scores').get().n,0);
 }finally{f.db.close()}
});
test('concurrent requests cannot exceed the shared mailbox email quota',async()=>{
 const f=await fixture();try{
  const roles=['member','reviewer','organizer'];
  const results=await Promise.all(Array.from({length:12},(_,i)=>handleE2E(post('request-code',{email:'owner@example.invalid',role:roles[i%3]}),f.env)));
  assert.equal(results.filter(r=>r.status===200).length,3);
  assert.equal(results.filter(r=>r.status===429).length,9);
  assert.equal(f.db.prepare('SELECT COUNT(*) n FROM e2e_email_challenges').get().n,3);
 }finally{f.db.close()}
});
