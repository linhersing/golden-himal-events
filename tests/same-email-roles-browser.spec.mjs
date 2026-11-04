import {test,expect} from '@playwright/test';

test('one staff OTP shows only server-granted roles and switches without another email',async({page})=>{
 let role=null,emails=0;
 const available_roles=['member','reviewer','organizer'];
 await page.route('**/api/e2e/**',async route=>{
  const path=new URL(route.request().url()).pathname.split('/').pop();
  let result={ok:true},status=200;
  if(path==='me'){if(!role){status=401;result={ok:false,error:'login_required'}}else result={ok:true,account:{id:'test-'+role,role,available_roles}}}
  else if(path==='request-code'){expect(route.request().postDataJSON().role).toBe('staff');emails++;result={ok:true,challenge_id:'fictional-qa'}}
  else if(path==='verify-code'){role='organizer'}
  else if(path==='switch-role'){role=route.request().postDataJSON().role;result={ok:true,account:{id:'test-'+role,role,available_roles}}}
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
 await page.route('**/api/e2e/**',route=>route.fulfill({status:200,json:new URL(route.request().url()).pathname.endsWith('/me')?{ok:true,account:{id:'judge',role:'reviewer',available_roles:['reviewer']}}:{ok:true,queue:[]}}));
 await page.goto('/backoffice.html');await expect(page.locator('#judge-dashboard')).toBeVisible();
 await expect(page.locator('[data-role-tab=organizer]')).toBeHidden();
 await expect(page.locator('#organizer-dashboard')).toBeHidden();
});
