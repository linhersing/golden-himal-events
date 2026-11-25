import {test,expect} from '@playwright/test';

// No real OTP or shared D1 record is used. The fixture models a verified
// member session and a temporary failure to fetch that member's own entries.
for(const language of ['zh','en','ne']){
 test('video sharing instructions clarify YouTube is optional in '+language,async({page})=>{
  const expected={zh:'不必有自己的 YouTube 頻道',en:'No YouTube channel is required',ne:'YouTube च्यानल अनिवार्य छैन'};
  await page.addInitScript(lang=>localStorage.setItem('ghv_ui_language_v1',lang),language);
  await page.goto('/member');
  await expect(page.locator('[data-l="videoPlatformSimpleNote"]')).toContainText(expected[language]);
 });
 test('member OTP keeps editable draft and retries safely in '+language,async({page})=>{
  let verified=false,entryReads=0,submissions=0;
  await page.addInitScript(lang=>localStorage.setItem('ghv_ui_language_v1',lang),language);
  await page.route('**/api/e2e/**',async route=>{
   const path=new URL(route.request().url()).pathname;
   let status=200,body={ok:true,testOnly:true};
   if(path.endsWith('/signup-config'))body={ok:true,mode:'invited',testOnly:true};
   else if(path.endsWith('/request-code'))body={ok:true,challenge_id:'1b0abcda-3d01-48a7-b416-7aa093b2b300'};
   else if(path.endsWith('/verify-code'))verified=true;
   else if(path.endsWith('/me')){
    if(!verified){status=401;body={ok:false,error:'login_required'}}
    else body={ok:true,account:{id:'member-001',role:'member',available_roles:['member']},muse_form_enabled:true,frontline_form_enabled:true,nepal_locations_enabled:true,five_demo_enabled:true};
   }else if(path.endsWith('/applications')&&route.request().method()==='POST'){
    submissions++;status=403;body={ok:false,error:'blocked_in_fixture'};
   }else if(path.endsWith('/applications')){
    entryReads++;
    if(entryReads===1){status=503;body={ok:false,error:'test_database_unavailable'}}
    else body={ok:true,applications:[]};
   }
   await route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  });
  await page.goto('/member');
  await page.locator('#member-email-form input[name="email"]').fill('test@example.org');
  await page.locator('#member-email-form button[type="submit"]').click();
  await expect(page.locator('#member-code-form')).toBeVisible();
  await page.locator('#member-code-form input[name="code"]').fill('123456');
  await page.locator('#member-code-form button[type="submit"]').click();
  await expect(page.locator('#member-panel')).toBeVisible();
  await expect(page.locator('#signin-panel')).toBeHidden();
  await expect(page.locator('#muse-test-fields input[name="full_name"]')).toBeEnabled();
  await page.locator('#muse-test-fields input[name="full_name"]').fill('TEST SINGER');
  await expect(page.locator('#muse-test-fields input[name="full_name"]')).toHaveValue('TEST SINGER');
  await expect(page.locator('#application-form button[type="submit"]')).toBeDisabled();
  await expect(page.locator('#member-retry-load')).toBeVisible();
  expect(submissions).toBe(0);

  await page.locator('#member-retry-load').click();
  await expect(page.locator('#member-retry-load')).toBeHidden();
  await expect(page.locator('#application-form button[type="submit"]')).toBeEnabled();
  await expect(page.locator('#signin-panel')).toBeHidden();
  expect(entryReads).toBe(2);
  expect(submissions).toBe(0);
 });

 test('member private fields remain locked without server storage capability in '+language,async({page})=>{
  await page.addInitScript(lang=>localStorage.setItem('ghv_ui_language_v1',lang),language);
  await page.route('**/api/e2e/**',async route=>{
   const path=new URL(route.request().url()).pathname;
   let status=200,body={ok:true,testOnly:true};
   if(path.endsWith('/me'))body={ok:true,account:{id:'member-002',role:'member',available_roles:['member']}};
   else if(path.endsWith('/applications'))body={ok:true,applications:[]};
   else if(path.endsWith('/signup-config'))body={ok:true,mode:'invited'};
   await route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  });
  await page.goto('/member');
  await expect(page.locator('#member-panel')).toBeVisible();
  await expect(page.locator('#muse-test-fields input[name="full_name"]')).toBeDisabled();
  await expect(page.locator('#signin-panel')).toBeHidden();
 });
}


for(const allowed of [true,false])test('registration window cannot override the entry-list recovery gate: '+allowed,async({page})=>{
 let entryReads=0,posts=0;
 await page.route('**/api/staging/registration-window',route=>route.fulfill({json:{ok:true,phase:allowed?'testing':'countdown',testSubmissionsAllowed:allowed,opensAt:'2027-01-01T00:00:00+05:45',serverNow:'2026-11-24T10:00:00+05:45'}}));
 await page.route('**/api/e2e/**',async route=>{
  const key=new URL(route.request().url()).pathname.split('/').pop();
  if(key==='me')return route.fulfill({json:{ok:true,account:{id:'synthetic-member',role:'member',available_roles:['member']},muse_form_enabled:true}});
  if(key==='applications'&&route.request().method()==='POST'){posts++;return route.fulfill({status:409,json:{ok:false}})}
  if(key==='applications'){entryReads++;return route.fulfill(entryReads===1?{status:503,json:{ok:false,error:'test_database_unavailable'}}:{json:{ok:true,applications:[]}})}
  return route.fulfill({json:{ok:true}});
 });
 await page.goto('/member.html#register');
 const submit=page.locator('#application-form button[type=submit]');
 await expect(page.locator('#member-retry-load')).toBeVisible();
 await expect(page.locator('#ghv-entry-window')).toHaveAttribute('data-phase',allowed?'testing':'countdown');
 await page.locator('[data-lang=en]').click();
 await expect(submit).toBeDisabled();
 await page.locator('#member-retry-load').click();
 await expect(page.locator('#member-retry-load')).toBeHidden();
 if(allowed)await expect(submit).toBeEnabled();else await expect(submit).toBeDisabled();
 expect(posts).toBe(0);
});
