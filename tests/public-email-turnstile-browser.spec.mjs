import {test,expect} from '@playwright/test';

// Browser-UI tests use synthetic API responses and challenge callbacks.
// Real Cloudflare Siteverify, inbox delivery and D1 writes require live acceptance.
const routeAPI=async(page,track)=>{
 await page.route('**/api/e2e/**',async route=>{
  const name=new URL(route.request().url()).pathname.split('/').at(-1);
  let data,status=200;
  if(name==='signup-config')data={ok:true,testOnly:true,mode:'public_test',siteKey:'0x4AAAAAA-synthetic-site-key'};
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

test('synthetic successful challenge enables Email code request and sends token',async({page})=>{
 const sends=[];
 await routeAPI(page,sends);
 await page.route('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit',route=>route.fulfill({
  status:200,contentType:'application/javascript',
  body:"window.turnstile={ready:cb=>cb(),render:(el,cfg)=>{const b=document.createElement('div');b.textContent='TEST HUMAN CHECK';el.append(b);window.__solveTestChallenge=()=>cfg.callback('synthetic-one-time-turnstile-token');return 'widget-test'},reset:()=>{},remove:()=>{}};"
 }));
 await page.goto('/member.html#register');
 await page.locator('[data-lang=zh]').click();
 const send=page.locator('#member-email-form button[type=submit]');
 await expect(page.locator('#signup-turnstile')).toContainText('TEST HUMAN CHECK');
 await expect(send).toBeDisabled();
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
