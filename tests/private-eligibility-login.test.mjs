import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker from '../backend/eligibility-test-worker.js';
import {accounts,applicationId,envVars,files,png,seed} from './fixtures/private-eligibility-fixtures.mjs';

function fixture(){
 const sqlite=new DatabaseSync(':memory:');
 sqlite.exec('PRAGMA foreign_keys=ON');
 for(const file of [...files,'1017_staff_auth_limits_STAGING_ONLY.sql'])sqlite.exec(readFileSync(new URL('../backend/migrations/'+file,import.meta.url),'utf8'));
 for(const [sql,values] of seed.filter(([sql])=>!sql.startsWith('INSERT INTO e2e_sessions')))sqlite.prepare(sql).run(...values);
 const db={prepare(sql){let values=[];return {bind(...args){values=args;return this},first(){return sqlite.prepare(sql).get(...values)},all(){return {results:sqlite.prepare(sql).all(...values)}},run(){return {meta:{changes:sqlite.prepare(sql).run(...values).changes}}}}}};
 const objects=new Map();
 const bucket={async put(key,bytes){objects.set(key,bytes);return {size:bytes.length}},async head(key){const bytes=objects.get(key);return bytes?{size:bytes.length}:null},async get(key){const bytes=objects.get(key);return bytes?{size:bytes.length,body:bytes}:null},async delete(key){objects.delete(key)}};
 const mail=[];
 const env={...envVars,STAGING_PASSWORD_SIGNUP_ENABLED:'false',STAGING_PUBLIC_SIGNUP_ENABLED:'false',STAGING_STAFF_TURNSTILE_REQUIRED:'true',STAGING_FROM_EMAIL:'verify@example.invalid',STAGING_TURNSTILE_SITE_KEY:'0xfictionalprivatechallenge',STAGING_TURNSTILE_SECRET_KEY:'0xfictionalprivatesecret',EMAIL:{async send(message){mail.push(message)}},ELIGIBILITY_TEST_D1:db,ELIGIBILITY_TEST_R2:bucket};
 const origin='http://localhost';
 const send=(path,{method='GET',body,cookie,headers={}}={})=>worker.fetch(new Request(origin+path,{method,headers:{Origin:origin,...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...headers},body:body?JSON.stringify(body):undefined}),env);
 return {sqlite,env,mail,send,origin,objects};
}

test('isolated login issues real owner/organizer cookies while preserving document ownership and logout',async t=>{
 const f=fixture();
 t.after(()=>f.sqlite.close());
 t.mock.method(globalThis,'fetch',async(url,options)=>{
  assert.equal(String(url),'https://challenges.cloudflare.com/turnstile/v0/siteverify');
  const body=JSON.parse(options.body);
  return Response.json({success:body.response==='synthetic-human',action:body.remoteip==='192.0.2.18'?'ghv_signup':'ghv_staff_login',hostname:'localhost'});
 });
 const doc='/api/e2e/eligibility-document?id='+applicationId;
 const requested=await f.send('/api/e2e/request-code',{method:'POST',headers:{'CF-Connecting-IP':'192.0.2.18'},body:{email:accounts.owner.mail,role:'member',turnstile_token:'synthetic-human'}});
 assert.equal(requested.status,200,await requested.clone().text());
 const challenge=(await requested.json()).challenge_id;
 const code=f.mail.at(-1).text.match(/code is (\d{6})/)[1];
 assert.equal((await f.send(doc)).status,401);
 assert.equal((await f.send('/api/e2e/verify-code',{method:'POST',body:{challenge_id:challenge,code:'invalid'}})).status,400);
 const verified=await f.send('/api/e2e/verify-code',{method:'POST',body:{challenge_id:challenge,code}});
 assert.equal(verified.status,200,await verified.clone().text());
 const setCookie=verified.headers.get('Set-Cookie');
 assert.match(setCookie,/; HttpOnly; Secure; SameSite=Lax/);
 const cookie=setCookie.split(';')[0];
 assert.equal((await f.send('/api/e2e/verify-code',{method:'POST',body:{challenge_id:challenge,code}})).status,401);
 const me=await (await f.send('/api/e2e/me',{cookie})).json();
 assert.equal(me.account.id,accounts.owner.id);
 assert.equal(me.account.role,'member');
 const controlled=f.env.ELIGIBILITY_TEST_ACCOUNT_IDS;
 f.env.ELIGIBILITY_TEST_ACCOUNT_IDS=accounts.organizer.id;
 assert.equal((await f.send(doc,{cookie})).status,403);
 f.env.ELIGIBILITY_TEST_ACCOUNT_IDS=controlled;
 const put=new Request(f.origin+doc,{method:'PUT',headers:{Cookie:cookie,Origin:f.origin,'Content-Type':'image/png','If-Match':'"none"','Idempotency-Key':crypto.randomUUID(),'X-Eligibility-Test-Consent':'yes'},body:png});
 assert.equal((await worker.fetch(put,f.env)).status,201);
 assert.equal((await f.send(doc.replace('?','/download?'),{cookie})).status,200);
 const source={'CF-Connecting-IP':'192.0.2.17'};
 const blocked=await f.send('/api/e2e/request-code',{method:'POST',headers:source,body:{email:accounts.organizer.mail,role:'organizer'}});
 assert.equal(blocked.status,403);
 const staff=await f.send('/api/e2e/request-code',{method:'POST',headers:source,body:{email:accounts.organizer.mail,role:'organizer',turnstile_token:'synthetic-human'}});
 assert.equal(staff.status,200,await staff.clone().text());
 const staffChallenge=(await staff.json()).challenge_id;
 const staffCode=f.mail.at(-1).text.match(/code is (\d{6})/)[1];
 const staffVerified=await f.send('/api/e2e/verify-code',{method:'POST',headers:source,body:{challenge_id:staffChallenge,code:staffCode}});
 assert.equal(staffVerified.status,200);
 const staffCookie=staffVerified.headers.get('Set-Cookie').split(';')[0];
 assert.equal((await f.send(doc.replace('?','/download?'),{cookie:staffCookie})).status,200);
 assert.equal((await worker.fetch(new Request(f.origin+doc,{method:'DELETE',headers:{Cookie:staffCookie,Origin:f.origin,'If-Match':'"none"'}}),f.env)).status,403);
 assert.equal((await f.send('/api/e2e/logout',{method:'POST',cookie})).status,200);
 assert.equal((await f.send(doc,{cookie})).status,401);
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM e2e_sessions WHERE account_id=?').get(accounts.owner.id).n,0);
 assert.equal(f.objects.size,1);
 f.sqlite.exec('UPDATE e2e_sessions SET expires_at=1');
 assert.equal((await f.send(doc,{cookie:staffCookie})).status,401);
});

test('invited member still needs a valid server challenge; rejected source/action/host cannot write authentication state',async t=>{
 const f=fixture();t.after(()=>f.sqlite.close());
 let answer={success:true,action:'ghv_signup',hostname:'localhost'};
 t.mock.method(globalThis,'fetch',async()=>Response.json(answer));
 const body={email:accounts.owner.mail,role:'member',turnstile_token:'synthetic-human'};
 const headers={'CF-Connecting-IP':'192.0.2.18'};
 const attempt=payload=>f.send('/api/e2e/request-code',{method:'POST',headers,body:payload});
 assert.equal((await attempt({...body,turnstile_token:undefined})).status,403);
 assert.equal((await f.send('/api/e2e/request-code',{method:'POST',body})).status,403);
 for(const bad of [{success:false,action:'ghv_signup',hostname:'localhost'},{success:true,action:'ghv_staff_login',hostname:'localhost'},{success:true,action:'ghv_signup',hostname:'foreign.example.invalid'}]){
  answer=bad;assert.equal((await attempt(body)).status,403);
 }
 assert.equal(f.mail.length,0);
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM e2e_email_challenges').get().n,0);
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM e2e_sessions').get().n,0);
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM e2e_staff_auth_attempts').get().n,0);
 assert.equal((await attempt({...body,email:'uninvited@example.invalid'})).status,403);
 assert.equal((await f.send('/api/e2e/request-code',{method:'POST',headers:{...headers,'Content-Type':'text/plain'},body})).status,400);
 assert.equal((await attempt({...body,padding:'x'.repeat(2700)})).status,400);
 for(const role of ['reviewer','staff',undefined])assert.equal((await attempt({...body,role})).status,403);
 assert.equal(f.mail.length,0);
 f.env.STAGING_PUBLIC_SIGNUP_ENABLED='true';
 assert.equal((await attempt(body)).status,503);
 f.env.STAGING_PUBLIC_SIGNUP_ENABLED='false';
 f.env.STAGING_TURNSTILE_SECRET_KEY='';answer={success:true,action:'ghv_signup',hostname:'localhost'};
 assert.equal((await attempt(body)).status,503);
 assert.equal(f.mail.length,0);
});

test('removing an invitation after sending a code cannot mint an owner session',async t=>{
 const f=fixture();t.after(()=>f.sqlite.close());
 t.mock.method(globalThis,'fetch',async()=>Response.json({success:true,action:'ghv_signup',hostname:'localhost'}));
 const requested=await f.send('/api/e2e/request-code',{method:'POST',headers:{'CF-Connecting-IP':'192.0.2.18'},body:{email:accounts.owner.mail,role:'member',turnstile_token:'synthetic-human'}});
 assert.equal(requested.status,200);
 const challenge_id=(await requested.json()).challenge_id,code=f.mail.at(-1).text.match(/code is (\d{6})/)[1];
 f.env.STAGING_ALLOWED_EMAILS='';
 assert.equal((await f.send('/api/e2e/verify-code',{method:'POST',body:{challenge_id,code}})).status,403);
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM e2e_sessions').get().n,0);
});

test('reviewer challenges cannot be verified through the document login bridge',async t=>{
 const f=fixture();t.after(()=>f.sqlite.close());
 const id=crypto.randomUUID(),now=Math.floor(Date.now()/1000);
 f.sqlite.prepare('INSERT INTO e2e_email_challenges(id,email_fingerprint,code_fingerprint,kind,expires_at,created_at) VALUES(?,?,?,?,?,?)').run(id,'synthetic-reviewer','not-the-code','reviewer',now+600,now);
 const denied=await f.send('/api/e2e/verify-code',{method:'POST',headers:{'CF-Connecting-IP':'192.0.2.18'},body:{challenge_id:id,code:'123456'}});
 assert.equal(denied.status,403);
 assert.equal(f.sqlite.prepare('SELECT attempts FROM e2e_email_challenges WHERE id=?').get(id).attempts,0);
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM e2e_sessions').get().n,0);
});

test('login dispatcher cannot forward other E2E endpoints, wrong methods or unsafe configuration',async t=>{
 const f=fixture();t.after(()=>f.sqlite.close());
 for(const [path,method] of [['/api/e2e/applications','GET'],['/api/e2e/delete-my-data','POST'],['/api/e2e/score','POST'],['/api/e2e/password-login','POST'],['/api/e2e/switch-role','POST']])assert.equal((await f.send(path,{method})).status,404,path);
 assert.equal((await f.send('/api/e2e/request-code')).status,405);
 assert.equal((await f.send('/api/e2e/me',{method:'POST'})).status,405);
 assert.equal((await f.send('/api/e2e/eligibility-document?id='+applicationId,{headers:{'X-Session-ID':accounts.owner.token}})).status,401);
 assert.equal((await f.send('/api/e2e/request-code',{method:'POST',headers:{Origin:'https://other.example.invalid'},body:{email:accounts.owner.mail}})).status,403);
 assert.equal(f.mail.length,0);
 const original=f.env.STAGING_STAFF_TURNSTILE_REQUIRED;
 f.env.STAGING_STAFF_TURNSTILE_REQUIRED='false';
 assert.equal((await f.send('/api/e2e/request-code',{method:'POST',body:{email:accounts.owner.mail}})).status,503);
 f.env.STAGING_STAFF_TURNSTILE_REQUIRED=original;
 f.env.ELIGIBILITY_TEST_MODE='';assert.equal((await f.send('/api/e2e/me')).status,404);
 f.env.ELIGIBILITY_TEST_MODE='synthetic';
 assert.equal((await worker.fetch(new Request('https://formal.example.invalid/api/e2e/me'),f.env)).status,404);
});
