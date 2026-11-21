import {test,expect} from '@playwright/test';

test('one staff OTP shows only server-granted roles and switches without another email',async({page})=>{
 let role=null,emails=0;
 const available_roles=['member','reviewer','organizer'];
 await page.route('**/api/e2e/**',async route=>{
  const path=new URL(route.request().url()).pathname.split('/').pop();
  let result={ok:true},status=200;
  if(path==='me'){if(!role){status=401;result={ok:false,error:'login_required'}}else result={ok:true,judging_policy:{mode:'all_stages_test'},account:{id:'test-'+role,role,available_roles}}}
  else if(path==='staff-login-config')result={ok:true,required:false};
  else if(path==='request-code'){expect(route.request().postDataJSON().role).toBe('staff');emails++;result={ok:true,challenge_id:'fictional-qa'}}
  else if(path==='verify-code'){role='organizer'}
  else if(path==='switch-role'){role=route.request().postDataJSON().role;result={ok:true,judging_policy:{mode:'all_stages_test'},account:{id:'test-'+role,role,available_roles}}}
  else if(path==='organizer-queue')result={ok:true,applications:[],testOnly:true};
  else if(path==='reviewer-queue')result={ok:true,queue:[],testOnly:true};
  else if(path==='applications')result={ok:true,applications:[],testOnly:true};
  else if(path==='logout')role=null;
  await route.fulfill({status,json:result});
 });
 await page.setViewportSize({width:1280,height:900});await page.goto('/backoffice.html');
 await expect(page.locator('.role-tabs')).toBeHidden();
 await page.screenshot({path:'test-results/same-email-roles/staff-single-login.png',fullPage:true});
 await page.locator('#back-email-form [name=email]').fill('tester@example.invalid');
 await page.locator('#back-email-form button').click();
 await page.locator('#back-code-form [name=code]').fill('123456');await page.locator('#back-code-form button[type=submit]').click();
 await expect(page.locator('#organizer-dashboard')).toBeVisible();
 await page.screenshot({path:'test-results/same-email-roles/staff-organizer-desktop.png',fullPage:true});
 await page.locator('[data-role-tab=reviewer]').click();await expect(page.locator('#judge-dashboard')).toBeVisible();
 await expect(page.locator('#organizer-dashboard')).toBeHidden();expect(emails).toBe(1);
 await page.setViewportSize({width:375,height:850});
 await page.screenshot({path:'test-results/same-email-roles/staff-reviewer-mobile.png',fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
 await page.reload();await expect(page.locator('#judge-dashboard')).toBeVisible();
 await page.goto('/member.html');await expect(page.locator('#member-panel')).toBeVisible();expect(role).toBe('member');
 await page.goto('/backoffice.html');await expect(page.locator('#organizer-dashboard')).toBeVisible();expect(emails).toBe(1);
 await page.locator('#back-logout').click();await expect(page.locator('.role-tabs')).toBeHidden();
});

test('reviewer-only login hides organizer controls',async({page})=>{
 await page.route('**/api/e2e/**',route=>route.fulfill({status:200,json:new URL(route.request().url()).pathname.endsWith('/me')?{ok:true,judging_policy:{mode:'all_stages_test'},account:{id:'judge',role:'reviewer',available_roles:['reviewer']}}:{ok:true,queue:[]}}));
 await page.goto('/backoffice.html');await expect(page.locator('#judge-dashboard')).toBeVisible();
 await expect(page.locator('[data-role-tab=organizer]')).toBeHidden();
 await expect(page.locator('#organizer-dashboard')).toBeHidden();
});


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
 await expect(page.locator('#signup-human-status')).toContainText('請完成真人驗證');
 await page.screenshot({path:'test-results/staff-security/mobile.png',fullPage:true});
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
 await expect(page.locator('#signup-human-status')).toContainText('真人驗證暫時無法使用');
 await page.screenshot({path:'test-results/staff-security/desktop.png',fullPage:true});
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

test('staff retry button recovers after config becomes available without page reload',async({page})=>{
 const sends=[];await mockStaff(page,'on',sends);
 let served=0;
 await page.route('**/api/e2e/staff-login-config',async route=>{
  served++;
  const json=served===1?{ok:true,required:true}:
   {ok:true,required:true,siteKey:'0x4AAAA-synthetic-site'};
  await route.fulfill({json});
 });
 await page.route('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit',r=>r.fulfill({
  status:200,contentType:'application/javascript',
  body:"window.turnstile={render:(el,cfg)=>{const d=document.createElement('div');d.textContent='RECOVERED HUMAN';el.append(d);window.__staffSolve=()=>cfg.callback('recovered-token');return 'widget-id'},reset:()=>{},remove:()=>{}};"
 }));
 await page.goto('/backoffice.html');
 const button=page.locator('#back-email-form button[type=submit]');
 await expect(page.locator('#signup-human-retry')).toBeVisible();
 await expect(button).toBeDisabled();
 await page.locator('#signup-human-retry').click();
 await expect(page.locator('#signup-turnstile')).toContainText('RECOVERED HUMAN');
 await page.evaluate(()=>window.__staffSolve());
 await expect(button).toBeEnabled();
 expect(served).toBeGreaterThanOrEqual(2);
});
