import {test,expect} from '@playwright/test';

test('one staff OTP shows only server-granted roles and switches without another email',async({page})=>{
 let role=null,emails=0;
 const available_roles=['member','reviewer','organizer'];
 await page.route('**/api/e2e/**',async route=>{
  const path=new URL(route.request().url()).pathname.split('/').pop();
  let result={ok:true},status=200;
  if(path==='me'){if(!role){status=401;result={ok:false,error:'login_required'}}else result={ok:true,account:{id:'test-'+role,role,available_roles},contact_enabled:role==='member',profile_enabled:false}}
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
 await expect(page.locator('#contact-info-fields')).toBeVisible();
 await expect(page.locator('#contact-info-fields [name=contact_email]')).toBeEnabled();
 await page.goto('/backoffice.html');await expect(page.locator('#organizer-dashboard')).toBeVisible();expect(emails).toBe(1);
 await page.locator('#back-logout').click();await expect(page.locator('.role-tabs')).toBeHidden();
});

test('reviewer-only login hides organizer controls',async({page})=>{
 await page.route('**/api/e2e/**',route=>route.fulfill({status:200,json:new URL(route.request().url()).pathname.endsWith('/me')?{ok:true,account:{id:'judge',role:'reviewer',available_roles:['reviewer']}}:{ok:true,queue:[]}}));
 await page.goto('/backoffice.html');await expect(page.locator('#judge-dashboard')).toBeVisible();
 await expect(page.locator('[data-role-tab=organizer]')).toBeHidden();
 await expect(page.locator('#organizer-dashboard')).toBeHidden();
});

test('member form sends contact consent as JSON boolean and checks contact readback',async({page})=>{
 let submitted=null;
 await page.route('**/api/e2e/**',async route=>{
  const url=new URL(route.request().url()),path=url.pathname.split('/').pop();
  let response={ok:true},status=200;
  if(path==='me')response={ok:true,account:{id:'member-qa',role:'member',available_roles:['member']},contact_enabled:true,profile_enabled:false};
  else if(path==='signup-config')response={ok:true,mode:'invited',testOnly:true};
  else if(path==='password-config')response={ok:true,enabled:false,testOnly:true};
  else if(path==='applications'){
   if(route.request().method()==='POST'){
    submitted=route.request().postDataJSON();
    response={ok:true,application_id:'qa-app-1',testOnly:true};status=201;
   }else response={ok:true,applications:submitted?[{
    id:'qa-app-1',stage_name:submitted.stage_name,song_title:submitted.song_title,
    demo_url:submitted.demo_url,round_code:submitted.round_code,category:submitted.category,
    contact_email:submitted.contact_email,contact_phone:submitted.contact_phone,
    status:'submitted',phase:'demo',payment_status:'unpaid',can_edit:1
   }]:[],testOnly:true};
  }
  await route.fulfill({status,json:response});
 });
 await page.goto('/member.html');
 await expect(page.locator('#contact-info-fields')).toBeVisible();
 const form=page.locator('#application-form');
 await form.locator('[name=stage_name]').fill('TEST Singer');
 await form.locator('[name=contact_email]').fill('tester@example.com');
 await form.locator('[name=contact_phone]').fill('+977 9812345678');
 await form.locator('[name=contact_consent]').check();
 await form.locator('[name=affiliation]').fill('TEST university');
 await form.locator('[name=song_title]').fill('TEST Song');
 await form.locator('[name=original_artist]').fill('TEST Artist');
 await form.locator('[name=song_language]').selectOption('Nepali');
 await form.locator('[name=song_key]').selectOption('Unknown');
 await form.locator('[name=demo_url]').fill('https://youtu.be/test-video-123');
 await form.locator('[name=student_confirmed]').check();
 await form.locator('[name=no_exclusive_contract]').check();
 await form.locator('[name=video_confirmed]').check();
 await form.locator('[type=submit]').click();
 await expect(page.locator('#member-welcome')).toBeVisible();
 expect(submitted?.contact_consent).toBe(true);
 expect(submitted?.video_confirmed).toBe(true);
 expect(submitted?.contact_phone).toBe('+977 9812345678');
});
