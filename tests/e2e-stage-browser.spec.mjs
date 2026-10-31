import {test,expect} from '@playwright/test';

test('persistent staging participant UI is separate from legacy localStorage mock',async({page})=>{
 await page.goto('/e2e-stage.html');
 await expect(page.locator('body')).toHaveAttribute('data-role','member');
 await expect(page.locator('#send-form')).toBeVisible();
 await expect(page.locator('#workspace')).toBeHidden();
 await expect(page.locator('.safety')).toContainText('STAGING');
 await expect(page.locator('[data-i18n="pageIntro"]')).toContainText('D1');
 await expect(page.locator('#email')).toHaveAttribute('type','email');
 await expect(page.locator('#application-form')).toHaveCount(1);
 await expect(page.locator('#queue')).toHaveCount(0);
 await page.locator('[data-lang="zh"]').click();
 await expect(page.locator('html')).toHaveAttribute('lang','zh-Hant');
 await expect(page.locator('#signin-heading')).toHaveText('Email 驗證與會員登入');
});
test('judge UI has its own login and a role-gated empty scoring surface',async({page})=>{
 await page.goto('/judge-stage.html');
 await expect(page.locator('body')).toHaveAttribute('data-role','reviewer');
 await expect(page.locator('#send-form')).toBeVisible();
 await expect(page.locator('#workspace')).toBeHidden();
 await expect(page.locator('#review-title')).toBeHidden();
 await expect(page.locator('#application-form')).toHaveCount(0);
 await page.locator('[data-lang="ne"]').click();
 await expect(page.locator('#signin-heading')).toContainText('इमेल');
});
test('staging member and judge login remain mobile usable',async({page})=>{
 await page.setViewportSize({width:375,height:800});
 for(const path of ['/e2e-stage.html','/judge-stage.html','/organizer-stage.html']){
  await page.goto(path);
  const r=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
  expect(r.scroll).toBeLessThanOrEqual(r.client);
  await expect(page.locator('#email')).toBeVisible();
  await expect(page.locator('[data-lang="en"]')).toBeVisible();
 }
});


test('Alan V2 preview shows Jan/Apr windows and invitation-only organizer surface',async({page})=>{
 await page.goto('/');
 await page.locator('.site-header [data-lang="zh"]').click();
 await expect(page.locator('.season-grid')).toContainText('2027年1月1日至31日');
 await expect(page.locator('.season-grid')).toContainText('2027年4月1日至30日');
 await expect(page.locator('.season-grid')).toContainText('2027年9月初');
 await expect(page.locator('.v2-rule-summary')).toContainText('NPR 332,000');
 await expect(page.locator('a[href="./organizer-stage.html"]')).toBeVisible();
 await page.goto('/e2e-stage.html');
 await expect(page.locator('#round option')).toHaveCount(2);
 await expect(page.locator('#round option').first()).toHaveAttribute('value','2027-01');
 await expect(page.locator('#round option').last()).toHaveAttribute('value','2027-04');
 await expect(page.locator('#province option')).toHaveCount(2);
 await page.goto('/organizer-stage.html');
 await expect(page.locator('body')).toHaveAttribute('data-role','organizer');
 await expect(page.locator('#admin-apps')).toBeHidden();
 await expect(page.locator('#send-form')).toBeVisible();
});

test('link-only participant entry has required URL guidance and no raw file controls',async({page})=>{
 // Controlled UI fixture only; this is not Cloudflare OTP/D1 acceptance evidence.
 const url='https://drive.google.com/file/d/test-performance/view?usp=sharing';
 await page.route('**/api/e2e/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  const data=path.endsWith('/me')?{ok:true,account:{id:'test-link-member',role:'member'}}:
   path.endsWith('/applications')?{ok:true,applications:[{id:'test-app',stage_name:'TEST LINK',round_code:'2027-01',phase:'demo',category:'community',status:'submitted',payment_status:'unpaid',song_title:'TEST SONG',original_artist:'TEST ARTIST',demo_url:url}]}:{ok:true,finalists:[]};
  await route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
 });
 await page.goto('/e2e-stage.html');
 await expect(page.locator('#workspace')).toBeVisible();
 await expect(page.locator('#demo')).toHaveAttribute('required','');
 await expect(page.locator('#demo')).toHaveAttribute('maxlength','2048');
 await expect(page.locator('#demo-help')).toContainText('Google Drive');
 await expect(page.locator('#applications a')).toHaveAttribute('href',url);
 await expect(page.locator('#applications input[type="file"]')).toHaveCount(0);
 await expect(page.locator('#applications')).toContainText('not collected');
});

test('blocked-session status follows language changes and phone controls stay at least 44px',async({page})=>{
 await page.route('**/api/e2e/me',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({ok:false,error:'e2e_not_configured'})}));
 await page.setViewportSize({width:320,height:812});
 await page.goto('/e2e-stage.html');
 await expect(page.locator('#status')).toContainText('not enabled');
 await page.locator('[data-lang="zh"]').click();
 await expect(page.locator('#status')).toContainText('尚未開放');
 await page.locator('[data-lang="ne"]').click();
 await expect(page.locator('#status')).toContainText('सेटिङ');
 for(const r of await page.locator('[data-lang]').evaluateAll(xs=>xs.map(x=>({w:x.getBoundingClientRect().width,h:x.getBoundingClientRect().height})))){
  expect(r.w).toBeGreaterThanOrEqual(44);expect(r.h).toBeGreaterThanOrEqual(44);
 }
});

test('OTP recovery distinguishes delivery failure and matches resent email reference',async({page})=>{
 // UI recovery fixture only: never evidence that a real inbox received email.
 await page.clock.install();let attempts=0;
 await page.route('**/api/e2e/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path.endsWith('/me'))return route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({ok:false,error:'login_required'})});
  if(path.endsWith('/request-code')){
   attempts++;
   if(attempts===1)return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({ok:false,error:'test_email_service_unavailable'})});
   return route.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,challenge_id:'fictional-challenge-'+attempts,request_ref:'request-'+attempts,resend_after:60})});
  }
 });
 await page.goto('/e2e-stage.html');await page.locator('#email').fill('qa+ghv-member@gmail.com');
 await page.locator('#send-form button').click();
 await expect(page.locator('#status')).toContainText('could not send');
 await expect(page.locator('#send-form')).toBeVisible();await expect(page.locator('#verify-form')).toBeHidden();
 await page.locator('#send-form button').click();
 await expect(page.locator('#verify-mailbox')).toContainText('request-2');
 await expect(page.locator('#resend-code')).toBeDisabled();
 await page.clock.fastForward(61000);await expect(page.locator('#resend-code')).toBeEnabled();
 await page.locator('#resend-code').click();
 await expect(page.locator('#verify-mailbox')).toContainText('request-3');
 await page.locator('[data-lang="zh"]').click();
 await expect(page.locator('#verify-mailbox')).toContainText('請求編號');
 await expect(page.locator('#verify-form')).toContainText('垃圾郵件');
});

test('late OTP response cannot replace a changed address or re-enable an in-flight resend',async({page})=>{
 await page.clock.install();let starts=0,releaseLate;const late=new Promise(resolve=>{releaseLate=resolve});
 await page.route('**/api/e2e/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path.endsWith('/me'))return route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({ok:false,error:'login_required'})});
  if(path.endsWith('/request-code')){
   starts++;const n=starts;if(n===2)await late;
   return route.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,challenge_id:'test-challenge-'+n,request_ref:'ref-'+n})});
  }
 });
 await page.goto('/e2e-stage.html');await page.locator('#email').fill('qa+old@gmail.com');await page.locator('#send-form button').click();
 await expect(page.locator('#verify-mailbox')).toContainText('ref-1');await page.clock.fastForward(61000);
 await page.locator('#resend-code').click();
 await page.locator('[data-lang="zh"]').click();await expect(page.locator('#resend-code')).toBeDisabled();
 await page.locator('#change-email').click();await page.locator('#email').fill('qa+new@gmail.com');
 await page.locator('#send-form button').click();await expect(page.locator('#verify-mailbox')).toContainText('ref-3');
 releaseLate();
 await expect.poll(()=>starts).toBe(3);
 await expect(page.locator('#verify-mailbox')).toContainText('qa+new@gmail.com');
 await expect(page.locator('#verify-mailbox')).toContainText('ref-3');
});

// Architecture UI fixture is served by the actual handler against local SQLite.
// This is browser QA, not proof of remote D1/email acceptance.
async function architectureFixture(page){
 const {DatabaseSync}=await import('node:sqlite');const {readFile}=await import('node:fs/promises');
 const {default:worker}=await import('../backend/staging-registration-worker.js');
 const db=new DatabaseSync(':memory:');db.exec(await readFile(new URL('../backend/migrations/1001_architecture_preview_ONLY.sql',import.meta.url),'utf8'));
 const E2E_DB={prepare(sql){let args=[];return {bind(...xs){args=xs;return this},async all(){return {results:db.prepare(sql).all(...args)}}}}};
 const response=await worker.fetch(new Request('https://example.invalid/api/staging/architecture-preview'),{E2E_DB});
 const body=await response.text();db.close();
 await page.route('**/api/staging/architecture-preview',route=>route.fulfill({status:response.status,contentType:'application/json',body}));
}
test('architecture preview exposes fictional participant, three scorecards and organizer without signing in',async({page})=>{
 await architectureFixture(page);await page.goto('/architecture-preview.html#participant');
 await expect(page.locator('#data-status')).toContainText('Cloudflare D1');
 await expect(page.locator('#participant-content')).toContainText('TEST MAYA');
 await expect(page.locator('#participant-content')).toContainText('actual collection deferred');
 await expect(page.locator('#participant-content input')).not.toHaveCount(0);
 for(const input of await page.locator('#participant-content input').all())await expect(input).toHaveAttribute('readonly','');
 await page.locator('[data-view="judges"]').click();await expect(page.locator('#judge-content .scorecard')).toHaveCount(3);
 await page.locator('[data-phase="final"]').click();await expect(page.locator('[data-phase="final"]')).toBeFocused();await expect(page.locator('#judge-content')).toContainText('/ 40');
 await page.locator('[data-view="organizer"]').click();await expect(page.locator('#standings')).toContainText('69.8');
 await expect(page.locator('input[type="email"],input[type="password"],input[type="file"]')).toHaveCount(0);
 await page.reload();await expect(page.locator('#standings')).toContainText('69.8');
});
test('architecture preview remains readable at five phone widths in all three languages',async({page})=>{
 await architectureFixture(page);await page.goto('/architecture-preview.html');await expect(page.locator('#data-status')).toContainText('Cloudflare D1');
 for(const width of [320,360,375,390,428]){
  await page.setViewportSize({width,height:812});
  for(const lang of ['en','ne','zh']){
   await page.locator('[data-lang="'+lang+'"]').click();
   for(const view of ['overview','participant','judges','organizer']){
    await page.locator('[data-view="'+view+'"]').click();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
   }
  }
 }
});
test('architecture data failure is shown without invented member records',async({page})=>{
 await page.route('**/api/staging/architecture-preview',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({ok:false,error:'architecture_preview_unavailable'})}));
 await page.goto('/architecture-preview.html#participant');await expect(page.locator('#data-status')).toHaveClass('error');
 await expect(page.locator('#participant-content')).toBeEmpty();await expect(page.locator('#personas')).toBeEmpty();
});
