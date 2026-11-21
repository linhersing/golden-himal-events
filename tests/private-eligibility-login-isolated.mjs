// Local workerd + Edge protocol rehearsal. No injected sessions or real mail.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,mkdtemp,mkdir,writeFile} from 'node:fs/promises';
import {join,resolve,extname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {chromium,expect} from '@playwright/test';
import {accounts,applicationId,envVars,files,png,seed} from './fixtures/private-eligibility-fixtures.mjs';

const dependencies=process.argv[2];
if(!dependencies)throw Error('Pass the Wrangler node_modules directory.');
const require=createRequire(join(resolve(dependencies),'private-login-fixture.cjs'));
const {Miniflare,Response,convertV4MiniflareOptions}=require('miniflare');
const {unstable_splitSqlQuery}=require('wrangler');
const {build}=require('esbuild');
const root=fileURLToPath(new URL('../',import.meta.url));
const [{text:script}]=(await build({entryPoints:[join(root,'backend/eligibility-test-worker.js')],bundle:true,platform:'neutral',format:'esm',write:false})).outputFiles;
const persistence=await mkdtemp(join(tmpdir(),'ghv-document-otp-'));
const evidence=resolve(process.argv[3]||'test-results/private-eligibility-login');
await mkdir(evidence,{recursive:true});
const messages=[],challenges=[],deniedOutbound=[];
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript'};
const bindings={...envVars,STAGING_PASSWORD_SIGNUP_ENABLED:'false',
 STAGING_PUBLIC_SIGNUP_ENABLED:'false',STAGING_TEST_APPROVAL_ENABLED:'true',STAGING_SUBMISSION_MODE:'links',
 STAGING_STAFF_TURNSTILE_REQUIRED:'true',STAGING_TURNSTILE_SITE_KEY:'0xfictionalprivatechallenge',STAGING_TURNSTILE_SECRET_KEY:'0xfictionalprivatesecret',
 STAGING_EMAIL_PROVIDER:'resend',STAGING_RESEND_API_KEY:'re_'+'x'.repeat(32),STAGING_FROM_EMAIL:'verify@mail.example.invalid',STAGING_RESEND_VERIFIED_DOMAIN:'mail.example.invalid'};
const runtime=new Miniflare(convertV4MiniflareOptions({host:'127.0.0.1',resourcePersistencePath:persistence,enableDevRegistry:false,workers:[{
 modules:true,script,compatibilityDate:'2026-10-28',bindings,
 d1Databases:{ELIGIBILITY_TEST_D1:'private-document-otp-fictional'},r2Buckets:{ELIGIBILITY_TEST_R2:'private-document-otp-fictional'},
 outboundService:async request=>{
  const url=new URL(request.url);
  if(url.href==='https://challenges.cloudflare.com/turnstile/v0/siteverify'){
   const body=await request.json();
   const action=body.response==='synthetic-staff'||body.response==='wrong-action'?'ghv_staff_login':'ghv_signup';
   const success=['synthetic-staff','synthetic-member','wrong-action','wrong-host'].includes(body.response);
   challenges.push({action,success});
   return Response.json({success,action,hostname:body.response==='wrong-host'?'foreign.example.invalid':'127.0.0.1'});
  }
  if(url.href==='https://api.resend.com/emails'){
   const mail=await request.json();
   assert(mail.to.every(address=>address.endsWith('@example.invalid')),'Only fictional test recipients');
   messages.push(mail);return Response.json({id:'synthetic-accepted-'+messages.length});
  }
  deniedOutbound.push(url.origin);return new Response(null,{status:403});
 },
 serviceBindings:{ELIGIBILITY_TEST_ASSETS:async request=>{
  const name=new URL(request.url).pathname.slice(1);
  try{return new Response(await readFile(join(root,'tests/fixtures/private-eligibility',name)),{headers:{'Content-Type':types[extname(name)]}})}
  catch{return new Response(null,{status:404})}
 }}
}]}));
let browser;
try{
 const db=await runtime.getD1Database('ELIGIBILITY_TEST_D1');
 const migrations=[...files,'1017_staff_auth_limits_STAGING_ONLY.sql'];
 for(const name of migrations)await db.batch(unstable_splitSqlQuery(await readFile(join(root,'backend/migrations',name),'utf8')).map(sql=>db.prepare(sql)));
 await db.batch(seed.filter(([sql])=>!sql.startsWith('INSERT INTO e2e_sessions')).map(([sql,args])=>db.prepare(sql).bind(...args)));
 assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM e2e_sessions').first()).n,0);
 const origin=(await runtime.ready).origin;
 assert.notEqual(new URL(origin).port,'4173');
 const documentPath='/api/e2e/eligibility-document?id='+applicationId;
 const downloadPath='/api/e2e/eligibility-document/download?id='+applicationId;
 browser=await chromium.launch({channel:'msedge',headless:true});
 const contextFor=async()=>{
  const context=await browser.newContext();
  assert.deepEqual(await context.cookies(),[]);
  await context.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());
  const page=await context.newPage();
  await page.goto(origin+'/eligibility-test.html?id='+applicationId);
  return {context,page};
 };
 const call=(page,path,{method='GET',body,headers={},bytes,raw=false}={})=>page.evaluate(async({path,method,body,headers,bytes,raw})=>{
  const response=await fetch(path,{method,credentials:'same-origin',cache:'no-store',headers:{...(body?{'Content-Type':'application/json'}:{}),...headers},body:bytes?new Uint8Array(bytes):body?JSON.stringify(body):undefined});
  return {status:response.status,cache:response.headers.get('Cache-Control'),type:response.headers.get('Content-Type'),disposition:response.headers.get('Content-Disposition'),data:raw?Array.from(new Uint8Array(await response.arrayBuffer())):await response.json()};
 },{path,method,body,headers,bytes,raw});
 const login=async(person,{testFailures=false}={})=>{
  const pair=await contextFor(),{context,page}=pair;
  const info=accounts[person],staff=info.role!=='member';
  const config=await call(page,staff?'/api/e2e/staff-login-config':'/api/e2e/signup-config');
  assert.equal(config.status,200);
  assert.equal(config.data.required,true);
  if(!staff)assert.equal(config.data.mode,'invited');
  const headers={'CF-Connecting-IP':'192.0.2.21'};
  const details={email:info.mail,role:staff?'organizer':'member',turnstile_token:staff?'synthetic-staff':'synthetic-member'};
  if(testFailures){
   const before=messages.length;
   const rejects=staff?['rejected']:['rejected','wrong-action','wrong-host',undefined];
   for(const turnstile_token of rejects)assert.equal((await call(page,'/api/e2e/request-code',{method:'POST',headers,body:{...details,turnstile_token}})).status,403);
   assert.equal(messages.length,before);
   assert.equal((await call(page,documentPath)).status,401);
  }
  const requested=await call(page,'/api/e2e/request-code',{method:'POST',headers,body:details});
  assert.equal(requested.status,200,JSON.stringify(requested.data));
  const mail=messages.findLast(mail=>mail.to.includes(info.mail));
  assert(mail,'OTP must come from the captured mock mail, not D1');
  const code=mail.text.match(/code is (\d{6})/)[1];
  const challenge_id=requested.data.challenge_id;
  if(testFailures){
   const wrong=String((Number(code)+1)%1000000).padStart(6,'0');
   assert.equal((await call(page,'/api/e2e/verify-code',{method:'POST',headers,body:{challenge_id,code:wrong,email:info.mail}})).status,401);
   assert.equal((await call(page,documentPath)).status,401);
  }
  const verified=await call(page,'/api/e2e/verify-code',{method:'POST',headers,body:{challenge_id,code,email:info.mail}});
  assert.equal(verified.status,200,JSON.stringify(verified.data));
  const cookie=(await context.cookies()).find(cookie=>cookie.name==='__Host-ghv-e2e');
  assert(cookie?.httpOnly&&cookie.secure&&cookie.sameSite==='Lax');
  assert.equal((await call(page,'/api/e2e/verify-code',{method:'POST',headers,body:{challenge_id,code,email:info.mail}})).status,401);
  const session=await call(page,'/api/e2e/me');
  assert.equal(session.status,200);
  assert.equal(session.data.account.id,info.id);
  assert.equal(session.data.account.role,info.role);
  assert.equal(session.data.judging_policy.mode,'final_only');
  await page.reload();
  return pair;
 };

 const guest=await contextFor();
 assert.equal((await call(guest.page,documentPath)).status,401);
 assert.equal((await call(guest.page,downloadPath)).status,401);
 for(const path of ['/api/e2e/applications','/api/e2e/organizer-queue','/api/e2e/reviewer-queue','/api/e2e/private-media','/api/e2e/password-login'])assert.equal((await call(guest.page,path)).status,404);
 assert.equal((await call(guest.page,'/api/e2e/request-code')).status,405);
 const beforeDeniedMail=messages.length;
 assert.equal((await call(guest.page,'/api/e2e/request-code',{method:'POST',headers:{'CF-Connecting-IP':'192.0.2.21'},body:{email:accounts.reviewer.mail,role:'reviewer',turnstile_token:'synthetic-staff'}})).status,403);
 assert.equal((await call(guest.page,'/api/e2e/request-code',{method:'POST',headers:{'CF-Connecting-IP':'192.0.2.21'},body:{email:'uninvited@example.invalid',role:'member',turnstile_token:'synthetic-member'}})).status,403);
 assert.equal(messages.length,beforeDeniedMail);
 assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM e2e_email_challenges').first()).n,0);
 assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM e2e_sessions').first()).n,0);
 const owner=await login('owner',{testFailures:true});
 await expect(owner.page.locator('#upload')).toBeVisible();
 // Private API validation is exercised with the actual OTP-issued cookie.
 const uploadHeaders={'Content-Type':'image/png','If-Match':'"none"','Idempotency-Key':crypto.randomUUID(),'X-Eligibility-Test-Consent':'yes'};
 assert.equal((await call(owner.page,documentPath,{method:'PUT',headers:uploadHeaders,bytes:[1,2,3]})).status,415);
 assert.equal((await call(owner.page,documentPath,{method:'PUT',headers:{...uploadHeaders,'X-Eligibility-Test-Consent':'no'},bytes:Array.from(png)})).status,422);
 let oversizedUiWrites=0;
 const countOversize=request=>{if(request.method()==='PUT')oversizedUiWrites++;};
 owner.page.on('request',countOversize);
 await owner.page.locator('[data-lang=en]').click();
 await owner.page.locator('#file').setInputFiles({name:'synthetic-too-large.png',mimeType:'image/png',buffer:Buffer.alloc(5*1024*1024+1)});
 await owner.page.locator('#consent').check();await owner.page.locator('button[type=submit]').click();
 await expect(owner.page.locator('#status')).toContainText('exceeds 5 MiB');
 assert.equal(oversizedUiWrites,0);owner.page.off('request',countOversize);
 // Browser form sends only the synthetic 1x1 PNG. Drop an acknowledged response
 // to exercise the unchanged same-key reconciliation journal through real auth.
 await owner.page.route('**/api/e2e/eligibility-document?id=*',async route=>{
  if(route.request().method()==='PUT'){
   const response=await route.fetch();assert.equal(response.status(),201);await route.abort();
  }else await route.continue();
 });
 await owner.page.locator('[data-lang=en]').click();
 await owner.page.locator('#file').setInputFiles({name:'synthetic-pixel.png',mimeType:'image/png',buffer:Buffer.from(png)});
 await owner.page.locator('#consent').check();await owner.page.locator('button[type=submit]').click();
 await expect(owner.page.locator('#status')).toContainText('Retry with the same file');
 await owner.page.unroute('**/api/e2e/eligibility-document?id=*');
 await owner.page.locator('button[type=submit]').click();
 await expect(owner.page.locator('#saved')).toBeVisible();
 const stored=await call(owner.page,documentPath);
 assert.equal(stored.status,200);assert.equal(stored.data.document.size,png.length);
 assert.doesNotMatch(JSON.stringify(stored.data),/object_key|eligibility-private\//);
 assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM e2e_private_eligibility_objects WHERE state='current'").first()).n,1);
 const ownerDownload=await call(owner.page,downloadPath,{raw:true});
 assert.equal(ownerDownload.status,200);assert.deepEqual(ownerDownload.data,Array.from(png));
 assert.match(ownerDownload.cache,/no-store/);assert.match(ownerDownload.disposition,/attachment/);
 assert.equal(ownerDownload.type,'application/octet-stream');
 for(const [width,lang] of [[320,'zh'],[390,'ne'],[1280,'en']]){
  await owner.page.setViewportSize({width,height:820});
  await owner.page.locator('[data-lang='+lang+']').click();
  await expect(owner.page.locator('#saved')).toBeVisible();
  assert(await owner.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await owner.page.screenshot({path:join(evidence,'owner-edge-'+width+'.png'),fullPage:true});
 }
 const organizer=await login('organizer',{testFailures:true});
 await expect(organizer.page.locator('#saved')).toBeVisible();
 await expect(organizer.page.locator('#upload')).toBeHidden();await expect(organizer.page.locator('#remove')).toBeHidden();
 assert.deepEqual((await call(organizer.page,downloadPath,{raw:true})).data,Array.from(png));
 assert.equal((await call(organizer.page,documentPath,{method:'PUT',headers:uploadHeaders,bytes:Array.from(png)})).status,403);
 assert.equal((await call(organizer.page,documentPath,{method:'DELETE',headers:{'If-Match':'"'+stored.data.document.revision+'"'}})).status,403);
 await organizer.page.screenshot({path:join(evidence,'organizer-read-only.png'),fullPage:true});
 const other=await login('other');
 assert.equal((await call(other.page,documentPath)).status,404);assert.equal((await call(other.page,downloadPath)).status,404);
 assert.equal((await call(other.page,documentPath,{method:'PUT',headers:uploadHeaders,bytes:Array.from(png)})).status,404);
 const ownerSecond=await login('owner');
 await expect(ownerSecond.page.locator('#saved')).toBeVisible();
 assert.equal((await call(ownerSecond.page,documentPath)).data.document.revision,stored.data.document.revision);
 ownerSecond.page.on('dialog',dialog=>dialog.accept());
 await ownerSecond.page.locator('#remove').click();await expect(ownerSecond.page.locator('#saved')).toBeHidden();
 assert.equal((await call(owner.page,downloadPath)).status,404);
 await (await runtime.getWorker()).scheduled();
 const bucket=await runtime.getR2Bucket('ELIGIBILITY_TEST_R2');
 assert.equal((await bucket.list()).objects.length,0);
 assert.equal((await call(ownerSecond.page,'/api/e2e/logout',{method:'POST'})).status,200);
 assert.equal((await call(ownerSecond.page,documentPath)).status,401);
 await db.prepare('UPDATE e2e_sessions SET expires_at=1 WHERE account_id=?').bind(accounts.owner.id).run();
 assert.equal((await call(owner.page,documentPath)).status,401);
 await db.prepare('UPDATE e2e_sessions SET expires_at=1 WHERE account_id=?').bind(accounts.organizer.id).run();
 assert.equal((await call(organizer.page,downloadPath)).status,401);
 assert.equal(deniedOutbound.length,0);
 const report={result:'PASS',runtime:'local Cloudflare workerd + isolated D1/R2',browser:'Microsoft Edge',origin,
  initialSessionCount:0,injectedCookies:0,actualMailSent:0,mockMailAccepted:messages.length,mockSiteverify:challenges,
   assertions:{ownerUploadReadback:true,ownerSecondLoginReadback:true,organizerReadOnly:true,otherMember404:true,reviewerLogin403:true,uninvitedMember403:true,guest401:true,
   badChallenge403:true,invitedOwnerHumanEnforced:true,wrongAction403:true,wrongHostname403:true,wrongOtp401:true,replayedOtp401:true,maskedMetadata:true,lostResponseSameKeyRetry:true,invalidSignature415:true,consentRequired422:true,oversizeUiNoWrite:true,
   unknownE2ERoutes404:true,wrongMethod405:true,logout401:true,expiredOwner401:true,expiredOrganizer401:true,withdrawal404:true,privateObjectsAfterCleanup:0,finalOnlyPolicy:true},
  edgeWidths:[320,390,1280],migrations,remoteValidation:'NOT RUN; no production deployment, remote schema, global flag or real documents'};
 await writeFile(join(evidence,'protocol-result.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report));
}finally{await browser?.close();await runtime.dispose();}
