import {test,expect} from '@playwright/test';

// Browser-UI tests use synthetic API responses and challenge callbacks.
// Real Cloudflare Siteverify, inbox delivery and D1 writes require live acceptance.
const routeAPI=async(page,track)=>{
 await page.route('**/api/e2e/**',async route=>{
  const name=new URL(route.request().url()).pathname.split('/').at(-1);
  let data,status=200;
  if(name==='signup-config')data={ok:true,testOnly:true,mode:'public_test',siteKey:'0x4AAAAAA-synthetic-site-key'};
  else if(name==='staff-login-config')data={ok:true,required:true,siteKey:'0x4AAAAAA-synthetic-site-key'};
  else if(name==='request-code'){
   track.push(JSON.parse(route.request().postData()||'{}'));
   data={ok:true,challenge_id:'11111111-2222-3333-4444-555555555555'};
  }else if(name==='me'){status=401;data={ok:false,error:'login_required'};}
  else{status=404;data={ok:false,error:'not_found'};}
  await route.fulfill({status,json:data});
 });
};

test('blocked Cloudflare script shows actionable retry instead of an invisible challenge',async({page})=>{
 const sends=[];
 await routeAPI(page,sends);
 await page.route('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit',route=>route.abort());
 await page.goto('/member.html#register');
 await page.locator('[data-lang=zh]').click();
 await expect(page.locator('#signup-turnstile')).toBeVisible();
 await expect(page.locator('#signup-human-status')).toContainText('無法載入');
 await expect(page.locator('#signup-human-retry')).toBeVisible();
 await expect(page.locator('#member-email-form button[type=submit]')).toBeDisabled();
 expect(sends).toHaveLength(0);
});

for(const actor of ['member','staff'])for(const [code,key,retryable]of [['110200','signupHumanDomain',false],['600010','signupHumanFailed',true]]){
 test(actor+' challenge '+code+' shows accurate localized recovery and rejects a previous token',async({page},testInfo)=>{
  await page.setViewportSize({width:actor==='member'?390:1440,height:844});
  const sends=[];await routeAPI(page,sends);
  await page.route('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit',route=>route.fulfill({contentType:'application/javascript',body:"window.turnstile={render:(el,cfg)=>{el.textContent='TEST HUMAN';window.__humanSolve=()=>cfg.callback('fixture-once-token');window.__humanError=code=>cfg['error-callback'](code);return 'fixture'},remove:()=>{},reset:()=>{}};"}));
  await page.goto(actor==='member'?'/member.html#register':'/backoffice.html');
  const send=page.locator('#'+(actor==='member'?'member':'back')+'-email-form [type=submit]');
  await expect(page.locator('#signup-turnstile')).toContainText('TEST HUMAN');
  await page.locator('[data-lang=en]').click();
  await page.evaluate(()=>window.__humanSolve());await expect(send).toBeEnabled();
  await expect(page.locator('#signup-human-status')).toHaveText(await page.evaluate(()=>window.GHVLocale.t('signupHumanVerified')));
  await page.evaluate(value=>window.__humanError(value),code);
  await expect(send).toBeDisabled();
  for(const language of ['zh','en','ne']){
   await page.locator('[data-lang='+language+']').click();
   const text=await page.evaluate(k=>window.GHVLocale.t(k),key);
   await expect(page.locator('#signup-human-status')).toHaveText(text+' (CF '+code+')');
   if(retryable)await expect(page.locator('#signup-human-retry')).toBeVisible();else await expect(page.locator('#signup-human-retry')).toBeHidden();
   if(language==='zh')await page.screenshot({path:testInfo.outputPath(actor+'-synthetic-error-'+code+'.png')});
  }
  expect(sends).toHaveLength(0);
 });
}

test('password registration supports async Turnstile without ready and shows domain configuration failure',async({page})=>{
 await page.route('**/api/e2e/**',route=>{
  const name=new URL(route.request().url()).pathname.split('/').at(-1);
  if(name==='password-config')return route.fulfill({json:{ok:true,enabled:true,siteKey:'0x4AAAAAA-password-fixture'}});
  if(name==='signup-config')return route.fulfill({json:{ok:true,mode:'invited'}});
  return route.fulfill({status:401,json:{ok:false,error:'login_required'}});
 });
 await page.route('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit',route=>route.fulfill({contentType:'application/javascript',body:"window.turnstile={ready:()=>{throw Error('ready rejects async loading')},render:(el,cfg)=>{el.textContent='TEST PASSWORD HUMAN';window.__passwordHumanError=code=>cfg['error-callback'](code);return 'fixture-password'},reset:()=>{}};"}));
 await page.goto('/member.html#register');
 await page.locator('[data-pw-tab=register]').click();
 await expect(page.locator('#password-turnstile')).toContainText('TEST PASSWORD HUMAN');
 await page.evaluate(()=>window.__passwordHumanError('110200'));
 await expect(page.locator('#password-feedback')).toContainText('真人驗證授權');
});

test('synthetic successful challenge enables Email code request and sends token',async({page})=>{
 await page.clock.install();
 const sends=[];
 await routeAPI(page,sends);
 await page.route('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit',route=>route.fulfill({
  status:200,contentType:'application/javascript',
  body:"window.turnstile={ready:()=>{throw Error('Turnstile ready rejects async loading')},render:(el,cfg)=>{const b=document.createElement('div');b.textContent='TEST HUMAN CHECK';b.attachShadow({mode:'closed'}).append(document.createElement('iframe'));el.append(b);window.__solveTestChallenge=()=>cfg.callback('synthetic-one-time-turnstile-token');return 'widget-test'},reset:()=>{},remove:()=>{}};"
 }));
 await page.goto('/member.html#register');
 await page.locator('[data-lang=zh]').click();
 const send=page.locator('#member-email-form button[type=submit]');
 await expect(page.locator('#signup-turnstile')).toContainText('TEST HUMAN CHECK');
 await expect(send).toBeDisabled();
 await page.clock.fastForward(11000);
 await expect(page.locator('#signup-human-retry')).toBeHidden();
 await page.evaluate(()=>window.__solveTestChallenge());
 await expect(page.locator('#signup-human-status')).toContainText('真人驗證已完成');
 await expect(send).toBeEnabled();
 await page.locator('#member-email-form [name=email]').fill('fictional-singer@example.invalid');
 await send.click();
 await expect(page.locator('#member-code-form')).toBeVisible();
 expect(sends).toHaveLength(1);
 expect(sends[0].email).toBe('fictional-singer@example.invalid');
 expect(sends[0].turnstile_token).toBe('synthetic-one-time-turnstile-token');
 await expect(send).toBeDisabled();
});
