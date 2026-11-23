import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,cp,mkdtemp,mkdir} from 'node:fs/promises';
import {join,resolve,extname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {chromium,expect} from '@playwright/test';
import {accounts,applicationId,envVars,files,png,request,seed} from './fixtures/private-eligibility-fixtures.mjs';

const dependencies=process.argv[2];
if(!dependencies)throw Error('Pass the path to the Wrangler 4.156.0 node_modules directory.');
const require=createRequire(join(resolve(dependencies),'fixture.cjs'));
const {Miniflare,Response,convertV4MiniflareOptions}=require('miniflare');
const {unstable_splitSqlQuery}=require('wrangler');
const {build}=require('esbuild');
const root=fileURLToPath(new URL('../',import.meta.url));
const [{text:script}]=(await build({entryPoints:[join(root,'backend/eligibility-test-worker.js')],bundle:true,platform:'neutral',format:'esm',write:false})).outputFiles;
const tmp=await mkdtemp(join(tmpdir(),'ghv-private-documents-'));
const evidence=resolve(process.argv[3]||'test-results/private-eligibility');
await mkdir(evidence,{recursive:true});
const persistence=join(tmp,'active'),snapshot=join(tmp,'synthetic-restore');
const contentTypes={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8'};
const bindings={...envVars};
function boot(resourcePersistencePath){
 return new Miniflare(convertV4MiniflareOptions({host:'127.0.0.1',resourcePersistencePath,enableDevRegistry:false,workers:[{
  modules:true,script,compatibilityDate:'2026-10-28',
  bindings,d1Databases:{ELIGIBILITY_TEST_D1:'synthetic-documents-db'},r2Buckets:{ELIGIBILITY_TEST_R2:'synthetic-documents-r2'},
  outboundService:async()=>new Response(null,{status:403}),
  serviceBindings:{ELIGIBILITY_TEST_ASSETS:async request=>{
   const name=new URL(request.url).pathname.slice(1);
   const asset=await readFile(join(root,'tests/fixtures/private-eligibility',name));
   return new Response(asset,{headers:{'Content-Type':contentTypes[extname(name)]}});
  }}
 }]}));
}
let runtime=boot(persistence),browser;
try{
 let db=await runtime.getD1Database('ELIGIBILITY_TEST_D1');
 for(const file of files){
  const sql=await readFile(join(root,'backend/migrations',file),'utf8');
  await db.batch(unstable_splitSqlQuery(sql).map(statement=>db.prepare(statement)));
 }
 await db.batch(seed.map(([sql,values])=>db.prepare(sql).bind(...values)));
 let host=(await runtime.ready).origin;
 const send=(path,options)=>fetch(request(path,{host,...options}));
 const key=crypto.randomUUID();
 const first=await send('',{method:'PUT',body:png,key});
 assert.equal(first.status,201,await first.clone().text());
 const saved=(await first.json()).document;
 assert.equal((await send('',{method:'PUT',body:png,key})).status,200);
 assert.equal((await send('/download',{role:'other'})).status,404);
 assert.equal((await send('/download',{role:null})).status,401);
 assert.equal((await send('/download',{role:'reviewer'})).status,403);
 const stored=await db.prepare("SELECT id,size,state FROM e2e_private_eligibility_objects WHERE state='current'").first();
 assert.deepEqual(stored,{id:saved.revision,size:png.length,state:'current'});
 assert.equal((await send('/download',{role:'organizer'})).status,200);
 await runtime.dispose();
 await cp(persistence,snapshot,{recursive:true,errorOnExist:true});
 runtime=boot(snapshot);host=(await runtime.ready).origin;
 db=await runtime.getD1Database('ELIGIBILITY_TEST_D1');
 let bucket=await runtime.getR2Bucket('ELIGIBILITY_TEST_R2');
 const restored=await send('/download',{role:'organizer'});
 assert.equal(restored.status,200,await restored.clone().text());
 assert.deepEqual(Uint8Array.from(await restored.bytes()),png);

 browser=await chromium.launch({channel:'msedge',headless:true});
 const context=await browser.newContext();
 await context.addCookies([{name:'__Host-ghv-e2e',value:accounts.owner.token,domain:'127.0.0.1',path:'/',httpOnly:true,secure:true,sameSite:'Lax'}]);
 const page=await context.newPage();
 page.on('dialog',dialog=>dialog.accept());
 for(const [width,lang] of [[320,'zh'],[390,'ne'],[1280,'en']]){
  await page.setViewportSize({width,height:820});
  await page.goto(host+'/eligibility-test.html?id='+applicationId);
  await expect(page.locator('#saved')).toBeVisible();
  await page.locator('[data-lang="'+lang+'"]').click();
  await expect(page.locator('html')).toHaveAttribute('lang',lang==='zh'?'zh-Hant':lang);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:join(evidence,'edge-'+width+'.png'),fullPage:true});
 }
 await page.locator('#remove').click();
 await expect(page.locator('#saved')).toBeHidden();
 assert.equal((await send('/download')).status,404);
 const uploadBtn=page.locator('button[type=submit]');
 await page.locator('#file').setInputFiles({name:'synthetic-pixel.png',mimeType:'image/png',buffer:Buffer.from(png)});
 await page.locator('#consent').check();
 await page.route('**/api/e2e/eligibility-document?id=*',async route=>{
  if(route.request().method()==='PUT'){
   const result=await route.fetch();
   assert.equal(result.status(),201);
   await route.abort();
  }else await route.continue();
 });
 await uploadBtn.click();
 await expect(page.locator('#status')).toContainText('Retry with the same file');
 await page.unrouteAll();
 await uploadBtn.click();
 await expect(page.locator('#saved')).toBeVisible();
 await page.reload();await expect(page.locator('#saved')).toBeVisible();
 const other=await browser.newContext();
 await other.addCookies([{name:'__Host-ghv-e2e',value:accounts.other.token,domain:'127.0.0.1',path:'/',httpOnly:true,secure:true,sameSite:'Lax'}]);
 const otherPage=await other.newPage();
 await otherPage.goto(host+'/eligibility-test.html?id='+applicationId);
 await expect(otherPage.locator('#status')).toContainText('目前無法使用');
 await expect(otherPage.locator('#upload')).toBeHidden();
 const after=(await (await send('')).json()).document;
 assert.equal((await send('',{method:'DELETE',revision:after.revision})).status,200);
 const worker=await runtime.getWorker();
 await worker.scheduled();
 assert.equal((await bucket.list()).objects.length,0);
 const stale=await db.prepare('UPDATE e2e_sessions SET expires_at=1 WHERE account_id=?').bind(accounts.owner.id).run();
 assert.equal(stale.meta.changes,1);
 assert.equal((await send('')).status,401);
 console.log(JSON.stringify({result:'PASS',runtime:'Cloudflare workerd with local D1 and R2 emulators',edge:[320,390,1280],
  restoredBytes:png.length,maskedReadback:true,retryAfterLostResponse:true,staleSession:401,privateR2ObjectsAfterCleanup:0}));
}finally{await browser?.close();await runtime?.dispose();}
