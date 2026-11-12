import {test,expect} from '@playwright/test';

const mockStaff=async(page,mode,sends)=>{
 await page.route('**/api/e2e/**',async route=>{
  const path=new URL(route.request().url()).pathname.split('/').pop();
  let status=200,json={ok:true};
  if(path==='me'){status=401;json={ok:false,error:'login_required'}}
  else if(path==='staff-login-config'){
   json=mode==='off'?{ok:true,required:false}:
    mode==='no-key'?{ok:true,required:true}:
    {ok:true,required:true,siteKey:'0x4AAAA-synthetic-site'};
  }else if(path==='request-code'){
   sends.push(route.request().postDataJSON());
   json={ok:true,challenge_id:'11111111-2222-3333-4444-555555555555'};
  }
  await route.fulfill({status,json});
 });
};
test('staff login requires its own human challenge before OTP; mobile has no horizontal overflow',async({page})=>{
 const sends=[];await mockStaff(page,'on',sends);
 await page.route('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit',route=>route.fulfill({
  status:200,contentType:'application/javascript',
  body:"window.turnstile={render:(el,cfg)=>{window.__staffChallengeAction=cfg.action;const d=document.createElement('div');d.textContent='TEST HUMAN';el.append(d);window.__staffSolve=()=>cfg.callback('staff-token-synthetic');return 'widget-id'},reset:()=>{},remove:()=>{}};"
 }));
 await page.setViewportSize({width:375,height:820});await page.goto('/backoffice.html');
 const button=page.locator('#back-email-form button[type=submit]');
 await expect(page.locator('#signup-turnstile')).toContainText('TEST HUMAN');
 await expect(button).toBeDisabled();
 expect(await page.evaluate(()=>window.__staffChallengeAction)).toBe('ghv_staff_login');
 await page.locator('#back-email-form [name=email]').fill('boss@example.invalid');
 await page.evaluate(()=>window.__staffSolve());
 await expect(button).toBeEnabled();
 await button.click();
 await expect(page.locator('#back-code-form')).toBeVisible();
 expect(sends).toHaveLength(1);
 expect(sends[0]).toMatchObject({role:'staff',email:'boss@example.invalid',turnstile_token:'staff-token-synthetic'});
 await expect(button).toBeDisabled();
 for(const width of [320,375,414]){
  await page.setViewportSize({width,height:820});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
 }
});
test('staff Turnstile script unavailable fails closed with retry',async({page})=>{
 const sends=[];await mockStaff(page,'on',sends);
 await page.route('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit',r=>r.abort());
 await page.goto('/backoffice.html');
 await expect(page.locator('#signup-human-retry')).toBeVisible();
 await expect(page.locator('#back-email-form button[type=submit]')).toBeDisabled();
 expect(sends).toHaveLength(0);
});
test('staff login missing keys fails closed, flag disabled remains backward compatible',async({page})=>{
 let sends=[];await mockStaff(page,'no-key',sends);
 await page.goto('/backoffice.html');
 await expect(page.locator('#signup-human-retry')).toBeVisible();
 await expect(page.locator('#back-email-form button[type=submit]')).toBeDisabled();
 expect(sends).toHaveLength(0);
 await page.unrouteAll();
 sends=[];await mockStaff(page,'off',sends);
 await page.goto('/backoffice.html');
 const button=page.locator('#back-email-form button[type=submit]');
 await expect(button).toBeEnabled();
 await page.locator('#back-email-form [name=email]').fill('judge@example.invalid');
 await button.click();
 expect(sends).toHaveLength(1);
 expect(sends[0]).not.toHaveProperty('turnstile_token');
});
