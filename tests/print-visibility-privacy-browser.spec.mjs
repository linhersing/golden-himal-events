import {test,expect} from '@playwright/test';

test('logout removes old member records from print preview',async({page})=>{
 let logged=false;
 await page.route('**/api/e2e/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  let result={ok:false,error:'login_required'},status=401;
  if(path.endsWith('/request-code'))result={ok:true,challenge_id:'test-id'};
  else if(path.endsWith('/verify-code')){logged=true;result={ok:true}}
  else if(path.endsWith('/logout')){logged=false;result={ok:true}}
  else if(path.endsWith('/me'))result=logged?{ok:true,account:{id:'test-member-uuid',role:'member'}}:result;
  else if(path.endsWith('/applications'))result={ok:true,applications:logged?[{
   id:'test-application-uuid',round_code:'2027-01',category:'community',
   stage_name:'PRIVATE TEST SINGER',song_title:'TEST SONG',original_artist:'TEST',
   phase:'demo',status:'submitted',payment_status:'unpaid',demo_url:''
  }]:[]};
  else if(path.endsWith('/finalists'))result={ok:true,finalists:[]};
  if(result.ok)status=200;
  await route.fulfill({status,contentType:'application/json',body:JSON.stringify(result)});
 });
 await page.goto('/e2e-stage.html');
 await page.locator('#email').fill('tester@example.invalid');
 await page.locator('#send-form button').click();
 await page.locator('#code').fill('123456');
 await page.locator('#verify-form button[type="submit"]').click();
 await expect(page.locator('#workspace')).toBeVisible();
 await expect(page.locator('#applications')).toContainText('PRIVATE TEST SINGER');
 await page.locator('#logout').click();
 await expect(page.locator('#workspace')).toBeHidden();
 await expect(page.locator('#applications')).toBeEmpty();
 await page.emulateMedia({media:'print'});
 const style=await page.locator('#workspace').evaluate(el=>getComputedStyle(el).display);
 expect(style).toBe('none');
 await expect(page.locator('#applications')).not.toContainText('PRIVATE TEST SINGER');
});
