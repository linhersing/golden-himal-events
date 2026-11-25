import {overviewOf} from './fixtures/organizer-overview.mjs';
import {test,expect} from '@playwright/test';

const account={id:'synthetic-organizer-session',role:'organizer',available_roles:['organizer']};
async function mock(page,options={}){
 await page.route('**/api/e2e/**',async route=>{
  const path=new URL(route.request().url()).pathname.split('/').at(-1);
  const data=path==='me' ? options.initial401
    ?{status:401,json:{ok:false,error:'login_required'}}
    :{status:200,json:{ok:true,account,session_expires_in_seconds:options.ttl??7200,session_expires_at:1893456000}}
    :path==='organizer-queue'
     ?options.queue401
       ?{status:401,json:{ok:false,error:'login_required'}}
       :{status:200,json:{ok:true,applications:[],overview:overviewOf([])}}
     :{status:200,json:{ok:true,required:false}};
  await route.fulfill(data);
 });
 await page.goto('/backoffice.html');
}

test('staff nearing expiry sees an explicit reminder without losing roster access',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await mock(page,{ttl:480});
 await expect(page.locator('#back-dashboard')).toBeVisible();
 await expect(page.locator('#staff-session-warning')).toBeVisible();
 await expect(page.locator('#staff-session-warning-text')).toContainText('8 分鐘');
 await expect(page.locator('#staff-session-expired')).toBeHidden();
});
test('expired authentication produces re-login CTA not a broken-contact-data message',async({page})=>{
 await mock(page,{queue401:true});
 await expect(page.locator('#staff-session-expired')).toBeVisible();
 await expect(page.locator('#staff-session-expired')).toContainText('登入有效時間結束');
 await expect(page.locator('#staff-session-relogin')).toBeVisible();
 await expect(page.locator('#back-dashboard')).toBeHidden();
 await expect(page.locator('#back-signin')).toBeVisible();
});
test('first time staff visitor has a normal login form, not an expired-session warning',async({page})=>{
 await mock(page,{initial401:true});
 await expect(page.locator('#back-signin')).toBeVisible();
 await expect(page.locator('#staff-session-expired')).toBeHidden();
});
test('mobile organizer preview packs search and filters into one line and two-column advanced grid',async({page})=>{
 await mock(page);
 for(const width of [280,320,375,390,430,768]){
  await page.setViewportSize({width,height:760});
  const summary=page.locator('.staff-mobile-summary');
  // The approved overview deliberately exposes all five registration status cards.
  await expect(summary.locator('.dash-stat:visible')).toHaveCount(5);
  for(const id of ['pending-count','organizer-pending-count','organizer-supplement-count','organizer-approved-count']){
   await expect(summary.locator('#'+id)).toBeVisible();
   await expect(summary.locator('#'+id)).toHaveText('0');
  }
  await expect(page.locator('#scores-count').locator('..')).toBeHidden();
  await expect(page.locator('#organizer-status option[value=scored]')).toHaveAttribute('hidden','');
  expect(await page.locator('#organizer-status option[value=scored]').evaluate(el=>el.disabled)).toBe(true);
  if(width<=600)await page.locator('#organizer-roster-open').click();
  const search=page.locator('#organizer-search');
  const filters=page.locator('.organizer-filter-panel');
  await expect(search).toBeVisible();await expect(filters).toBeVisible();
  const searchTop=await search.evaluate(el=>el.getBoundingClientRect().top);
  const filterTop=await filters.evaluate(el=>el.getBoundingClientRect().top);
  expect(Math.abs(searchTop-filterTop),'search and filter close at '+width).toBeLessThan(65);
  await filters.evaluate(el=>{el.open=true});
  const fields=await page.locator('.organizer-filter-grid .roster-field').evaluateAll(els=>els.map(el=>el.getBoundingClientRect()));
  if(width>=320)expect(Math.abs(fields[0].top-fields[1].top),'two filters in row at '+width).toBeLessThan(2);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth),'no horizontal scrolling '+width).toBeLessThanOrEqual(1);
  await filters.evaluate(el=>{el.open=false});
  if(width<=600)await page.locator('#organizer-summary-back').click();
 }
});


test('staff OTP waits up to ten minutes then clearly asks for a fresh code',async({page})=>{
 await page.clock.install();
 await page.route('**/api/e2e/**',route=>{
  const endpoint=new URL(route.request().url()).pathname.split('/').at(-1);
  if(endpoint==='me')return route.fulfill({status:401,json:{ok:false,error:'login_required'}});
  if(endpoint==='staff-login-config')return route.fulfill({json:{ok:true,required:false}});
  if(endpoint==='request-code')return route.fulfill({json:{ok:true,challenge_id:'synthetic-otp',resend_after:60,message:'Code expires in 10 minutes'}});
  return route.fulfill({status:200,json:{ok:true}});
 });
 await page.goto('/backoffice.html');
 await page.locator('#back-email-form [name=email]').fill('staff-qa@example.invalid');
 await page.locator('#back-email-form [type=submit]').click();
 const note=page.locator('#staff-otp-expiry');
 await expect(note).toBeVisible();
 await expect(note).toContainText('10 分鐘');
 await expect(page.locator('#back-code-form')).toBeVisible();
 await page.clock.fastForward(601000);
 await expect(note).toContainText('驗證碼已過期');
 await expect(page.locator('#back-code-form [type=submit]')).toBeDisabled();
 await page.locator('#back-change').click();
 await expect(page.locator('#back-email-form')).toBeVisible();
 await expect(note).toBeHidden();
});


test('staff login rejects unapproved addresses and guides invited staff to code entry',async({page})=>{
 let signedIn=false, rejectCode=true;
 await page.route('**/api/e2e/**',route=>{
  const endpoint=new URL(route.request().url()).pathname.split('/').at(-1);
  if(endpoint==='me')return route.fulfill(signedIn?{json:{ok:true,account}}:{status:401,json:{ok:false,error:'login_required'}});
  if(endpoint==='staff-login-config')return route.fulfill({json:{ok:true,required:false}});
  if(endpoint==='request-code'){
   if(route.request().postDataJSON().email!=='invited@example.invalid')return route.fulfill({status:403,json:{ok:false,error:'not_on_test_allowlist'}});
   return route.fulfill({json:{ok:true,challenge_id:'synthetic-otp'}});
  }
  if(endpoint==='verify-code'){
   if(rejectCode)return route.fulfill({status:400,json:{ok:false,error:'expired_or_invalid_code'}});
   signedIn=true;
  }
  if(endpoint==='organizer-queue')return route.fulfill({json:{ok:true,applications:[],overview:overviewOf([])}});
  return route.fulfill({json:{ok:true}});
 });
 await page.setViewportSize({width:390,height:844});
 await page.goto('/backoffice.html');
 const request=async email=>{
  await page.locator('#back-email-form [name=email]').fill(email);
  await page.locator('#back-email-form [type=submit]').click();
  await expect(page.locator('#staff-code-instructions')).toBeVisible();
  await expect(page.locator('#back-status')).toBeHidden();
 };
 const verify=async()=>{
  await page.locator('#back-code-form [name=code]').fill('123456');
  await page.locator('#back-code-form [type=submit]').click();
 };
 await page.locator('#back-email-form [name=email]').fill('uninvited@example.invalid');
 await page.locator('#back-email-form [type=submit]').click();
 await expect(page.locator('#back-status.error')).toHaveText('此 Email 未獲核准。');
 await expect(page.locator('#back-code-form')).toBeHidden();
 await page.locator('[data-lang=en]').click();
 await expect(page.locator('#back-status.error')).toHaveText('This email is not approved.');
 await page.locator('[data-lang=ne]').click();
 await expect(page.locator('#back-status.error')).toHaveText('यो इमेल स्वीकृत छैन।');
 await page.locator('[data-lang=zh]').click();
 await request('invited@example.invalid');
 await expect(page.locator('#staff-code-instructions')).toHaveText('此 Email 已核准，請輸入驗證碼。');
 const help=page.locator('#staff-no-code');
 await expect(help).not.toHaveAttribute('open','');
 await help.locator('summary').click();
 await expect(help.locator('p')).toContainText('垃圾郵件');
 await page.locator('[data-lang=en]').click();
 await expect(help.locator('p')).toContainText('Spam');
 await page.locator('[data-lang=ne]').click();
 await expect(help.locator('p')).toContainText('स्प्याम');
 await page.locator('[data-lang=zh]').click();
 await verify();
 await expect(page.locator('#back-status.error')).toContainText('未能登入');
 await expect(page.locator('#back-dashboard')).toBeHidden();
 rejectCode=false;
 await page.locator('#back-change').click();
 await request('invited@example.invalid');
 await expect(help).not.toHaveAttribute('open','');
 await verify();
 await expect(page.locator('#back-dashboard')).toBeVisible();
 await expect(page.locator('#back-status.success')).toContainText('登入成功');
});
