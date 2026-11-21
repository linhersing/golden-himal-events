import {test,expect} from '@playwright/test';

test('frontline TEST form shows one group with distinct A/B competition region when explicitly enabled',async({page})=>{
 let submission=null,created=false;
 await page.route('**/api/e2e/**',async route=>{
  const req=route.request(),path=new URL(req.url()).pathname,method=req.method();
  let value={ok:true};
  if(path.endsWith('/me'))value={ok:true,account:{id:'SYNTH-1',role:'member'},profile_enabled:false,nepal_locations_enabled:true,frontline_form_enabled:true,testOnly:true};
  else if(path.endsWith('/applications')&&method==='GET')value={ok:true,applications:created?[{id:'TEST-FRONTLINE-1',stage_name:'TEST Singer',song_title:'TEST Song',song_language:'Nepali',category:'community',competition_region:'B',eligibility_basis:'graduated',round_code:'2027-01',payment_status:'unpaid',status:'submitted',phase:'demo'}]:[],testOnly:true};
  else if(path.endsWith('/applications')&&method==='POST'){submission=req.postDataJSON();created=true;value={ok:true,application_id:'TEST-FRONTLINE-1',frontline_2027:true,competition_region:'B',testOnly:true};}
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(value)});
 });
 await page.goto('/member.html#register');
 await expect(page.locator('#frontline-test-fields')).toBeVisible();
 await expect(page.locator('#legacy-category-field')).toBeHidden();
 await expect(page.locator('#frontline-test-fields select[name=competition_region]')).toHaveValue('A');
 await page.locator('[name=competition_region]').selectOption('B');
 await page.locator('[name=eligibility_basis]').selectOption('graduated');
 await expect(page.locator('#category')).toHaveValue('community');
 await expect(page.locator('[data-l=frontlineEnabledNotice]')).toContainText('A/B 賽區');
 await page.locator('[name=stage_name]').fill('TEST Singer');
 await page.locator('[name=province]').selectOption('lumbini');
 await page.locator('[name=location_detail]').fill('Sample Municipality');
 await page.locator('[name=affiliation]').fill('Sample College graduate');
 await page.locator('[name=song_title]').fill('TEST Song');
 await page.locator('[name=original_artist]').fill('TEST Artist');
 await page.locator('[name=song_language]').selectOption('Nepali');
 await page.locator('[name=song_key]').selectOption('Unknown');
 await page.locator('[name=demo_url]').fill('https://youtu.be/dQw4w9WgXcQ');
 await page.locator('[name=video_confirmed]').check();
 await expect(page.locator('[name=adult_confirmed]')).toBeHidden();
 await page.locator('[name=no_exclusive_contract]').check();
 await page.locator('[name=nonreligious_song_ack]').check();
 await page.locator('#application-form button[type=submit]').click();
 await expect(page.locator('#entries')).toContainText('TEST-FRONTLINE-1');
 await expect(page.locator('#entries')).toContainText('單一競賽組別');
 expect(submission).toMatchObject({frontline_2027:true,competition_region:'B',eligibility_basis:'graduated',category:'community',province:'lumbini',round_code:'2027-01'});
});
test('legacy TEST form remains available when schema gate is not enabled',async({page})=>{
 await page.route('**/api/e2e/**',async r=>{
  const p=new URL(r.request().url()).pathname;
  const value=p.endsWith('/me')?{ok:true,account:{id:'SYNTH-2',role:'member'},profile_enabled:false,testOnly:true}:{ok:true,applications:[],testOnly:true};
  await r.fulfill({status:200,json:value});
 });
 await page.goto('/member.html#register');
 await expect(page.locator('#frontline-test-fields')).toBeHidden();
 await expect(page.locator('#legacy-category-field')).toBeVisible();
});
