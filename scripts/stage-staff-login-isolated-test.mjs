import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {fixtures,isolatedStaffRuntime} from '../tests/fixtures/staff-workerd.mjs';
const [dependencies,evidence]=process.argv.slice(2),repo=process.cwd();
const require=createRequire(join(repo,'package.json')),{chromium,expect}=require('@playwright/test');
const runtime=await isolatedStaffRuntime(repo,dependencies,join(repo,'tests/fixtures/stage-ui'),{stageRehearsal:true,voteRehearsal:true,staffLogin:true,seedStage:false});
const browser=await chromium.launch({channel:'msedge',headless:true});
const call=async(context,path,body)=>{const value=await context.pages()[0].evaluate(async({path,body})=>{const response=await fetch(path,{method:body?'POST':'GET',credentials:'same-origin',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});return {status:response.status,data:await response.json()}},{path,body});return {status:()=>value.status,json:async()=>value.data}};
const counts=async()=>({applications:(await runtime.db.prepare('SELECT COUNT(*) n FROM e2e_applications').first()).n,demos:(await runtime.db.prepare('SELECT COUNT(*) n FROM e2e_demo_2027_videos').first()).n,legacyScores:(await runtime.db.prepare('SELECT COUNT(*) n FROM e2e_live_scores').first()).n});
const summary={testOnly:true,official:false,provider:'MOCK mail and server Turnstile; actual protocol/session cookies',browser:'Microsoft Edge; disposable local workerd/D1; no physical phone'};
try{
 await mkdir(evidence,{recursive:true});const before=await counts(),db=runtime.db;
 await db.prepare("INSERT INTO stage_test_scope VALUES('FICTIONAL_STAGE_TEST_ONLY')").run();
 const panel=(await db.prepare("SELECT id FROM e2e_accounts WHERE role='reviewer' ORDER BY id").all()).results.map(r=>r.id);
 await db.prepare("INSERT INTO stage_test_rounds(code,status,panel,config) VALUES('final','open',?,'{}')").bind(JSON.stringify(panel)).run();
 for(const f of fixtures.slice(0,10))await db.batch([db.prepare("INSERT INTO stage_test_units VALUES('final',?,?,?,1)").bind(f.id,f.stageName,f.region),db.prepare("INSERT INTO stage_test_members VALUES('final',?,?)").bind(f.id,f.id)]);
 for(const [role,width] of [['organizer',1440],['reviewer',390]]){
  const context=await browser.newContext({viewport:{width,height:900}});
  try{
   assert.equal((await context.cookies()).length,0);
   await context.route('**/*',route=>{const url=route.request().url();if(url.startsWith(runtime.origin+'/'))return route.continue({headers:{...route.request().headers(),'CF-Connecting-IP':'198.51.100.31'}});if(url.startsWith('https://challenges.cloudflare.com/turnstile/v0/api.js'))return route.fulfill({contentType:'application/javascript',body:"window.turnstile={render(e,o){window.__staffProofOptions=o;o.callback('fictional-staff-proof');return 'mock'},reset(){},remove(){}};window.staffWidgetReady?.();"});return route.abort()});
   const page=await context.newPage();const asset=await context.request.get(runtime.origin+'/staff-login.html');assert.equal(asset.status(),200,'dedicated staff login asset must exist');assert.equal(asset.headers()['cache-control'],'no-store');assert.match(asset.headers()['content-security-policy']||'',/frame-ancestors 'none'/);await page.goto(runtime.origin+'/staff-login.html');
   await page.locator('#staff-email').fill(role+'@example.invalid');await page.locator('#staff-role').selectOption(role);await expect(page.locator('#staff-send')).toBeEnabled();await page.evaluate(()=>window.__staffProofOptions['expired-callback']());await expect(page.locator('#staff-send')).toBeDisabled();await page.locator('#staff-retry').click();await expect(page.locator('#staff-send')).toBeEnabled();await page.evaluate(()=>window.__staffProofOptions['error-callback']());await expect(page.locator('#staff-send')).toBeDisabled();await page.locator('#staff-retry').click();await expect(page.locator('#staff-send')).toBeEnabled();await page.locator('#staff-send').click();
   await expect(page.locator('#staff-code-form')).toBeVisible();
   const message=runtime.mailbox.at(-1),code=message.text.match(/code is (\d{6})/)[1];
   await page.locator('#staff-code').fill(code);await page.locator('#staff-verify').click();await expect(page.locator('#staff-session')).toBeVisible();
   assert((await context.cookies()).some(c=>c.name==='__Host-ghv-e2e'&&c.httpOnly&&c.secure));
   const me=await (await call(context,'/api/e2e/me')).json();assert.equal(me.account.role,role);assert.equal(me.judging_policy.mode,'final_only');
   const stage=await call(context,'/api/stage-test',{operation:'read',stage:'final'});assert.equal(stage.status(),200);assert.equal((await stage.json()).units.length,10);
   const vote=await call(context,'/api/vote-test',{operation:'initialize'});assert.equal(vote.status(),role==='organizer'?200:403);
   assert.equal((await call(context,'/api/e2e/organizer-queue')).status(),404);
   assert((await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth))<=1);
   await page.screenshot({path:join(evidence,role+'-authenticated.png')});
   if(role==='reviewer'){await expect(page.locator('#staff-vote-link')).toBeHidden();for(const language of ['en','ne','zh']){await page.locator('#staff-language').selectOption(language);await expect(page.locator('#staff-status')).toHaveText({en:'Invited staff session verified.',ne:'आमन्त्रित कर्मचारी सत्र प्रमाणित भयो।',zh:'已驗證受邀工作人員身分。'}[language]);assert((await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth))<=1);await page.screenshot({path:join(evidence,'reviewer-'+language+'.png')})}}
   if(role==='organizer'){await page.locator('#staff-stage-link').click();await expect(page.locator('#workspace h1')).toHaveText('季度總決賽');await page.goto(runtime.origin+'/staff-login.html');await expect(page.locator('#staff-session')).toBeVisible()}
   if(role==='reviewer')await runtime.db.prepare('UPDATE e2e_sessions SET expires_at=1 WHERE account_id=?').bind(me.account.id).run();
   await page.locator('#staff-logout').click();await expect(page.locator('#staff-email-form')).toBeVisible();assert.equal((await call(context,'/api/e2e/me')).status(),401);assert.equal((await call(context,'/api/stage-test',{operation:'read',stage:'final'})).status(),401);
   summary[role]='OTP → server cookie → final roster → role-scoped vote API → logout PASS';
  }finally{await context.close()}
 }
 assert.deepEqual(await counts(),before);summary.preserved=before;summary.status='PASS';
 await writeFile(join(evidence,'staff-login-evidence.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));
}finally{await browser.close();await runtime.close()}
