import {test,expect} from '@playwright/test';
test('singer-first homepage shows just register login and announcements on mobile and desktop',async({page})=>{
 for(const width of [320,375,768,1280]){
  await page.setViewportSize({width,height:850});
  await page.goto('/');
  await expect(page.locator('.front-actions .choice')).toHaveCount(3);
  await expect(page.locator('.choice-main')).toContainText('我要報名');
  await expect(page.locator('.front-actions a').nth(1)).toHaveAttribute('href','./member.html#login');
  await expect(page.locator('.front-actions a').nth(2)).toHaveAttribute('href','./news.html');
  await expect(page.locator('.backoffice-link')).toHaveCount(0);
  await expect(page.locator('.front-footer a.staff-stealth-link')).toHaveCount(1);
  if(width===1280)await page.screenshot({path:'test-results/ghv-hide-public-staff-nav-20261104/03-desktop-public-home-no-staff-link.png'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
 }
});
test('singer flow does not falsely create an account when email integration is off',async({page})=>{
 await page.route('**/api/e2e/**',async route=>route.fulfill({status:503,json:{ok:false,error:'e2e_not_configured'}}));
 await page.goto('/member.html#register');
 await expect(page.locator('#signin-panel')).toBeVisible();
 await expect(page.locator('#member-panel')).toBeHidden();
 await expect(page.locator('#member-email-form')).toBeVisible();
  await page.locator('#member-email-form [name=email]').fill('fictional@example.invalid');
 await page.locator('#member-email-form button').click();
 await expect(page.locator('#member-status')).toContainText('Email 驗證暫時無法使用');
 await expect(page.locator('#member-panel')).toBeHidden();
});
test('staff page has organizer and judge within one URL, and no invented paid registrations',async({page})=>{
 await page.route('**/api/e2e/**',async route=>route.fulfill({status:503,json:{ok:false,error:'e2e_not_configured'}}));
 await page.goto('/backoffice.html');
 await expect(page.locator('[data-role-tab]')).toHaveCount(2);
 await expect(page.locator('#paid-count')).toHaveText('0');
 await expect(page.locator('.role-tabs')).toBeHidden();
 await expect(page).toHaveURL(/backoffice\.html$/);
 await expect(page.locator('#back-dashboard')).toBeHidden();
});
test('organizer can inspect the audition link and open a notified 48-hour correction',async({page})=>{
 const entry={id:'SYNTH-SUPPLEMENT',stage_name:'TEST Singer',song_title:'TEST Song',round_code:'2027-01',
  category:'university',approval_state:'pending',demo_url:'https://youtu.be/test-video',video_supplement_available:1};
 const requests=[];
 await page.route('**/api/e2e/**',async route=>{
  const key=new URL(route.request().url()).pathname.split('/').pop();
  let result={ok:true};
  if(key==='me')result={ok:true,account:{id:'SYNTH-ORGANIZER',role:'organizer',available_roles:['organizer']}};
  if(key==='organizer-queue')result={ok:true,applications:[entry]};
  if(key==='request-video-supplement'){
   requests.push(route.request().postDataJSON());
   Object.assign(entry,{video_supplement_available:0,video_supplement_state:'pending',video_supplement_deadline:1820000000});
  }
  await route.fulfill({status:200,json:result});
 });
 await page.goto('/backoffice.html');
 const entryCard=page.locator('#admin-apps article');
 await expect(entryCard.getByRole('link',{name:'開啟參賽影片'})).toHaveAttribute('href',entry.demo_url);
 page.once('dialog',async dialog=>{
  expect(dialog.message()).toContain('請先聯絡選手');
  await dialog.accept();
 });
 await entryCard.getByRole('button',{name:'開放 48 小時補件'}).click();
 await expect(entryCard).toContainText('等待選手補正資料');
 await expect(entryCard.getByRole('button',{name:'核准測試報名'})).toHaveCount(0);
 expect(requests).toEqual([{application_id:entry.id}]);
});
test('member can view own stored entry, edit and delete its unpaid data in guarded endpoints',async({page})=>{
 let entries=[{id:'SYNTH-123',stage_name:'TEST Singer',song_title:'TEST Song',original_artist:'TEST Artist',song_language:'Nepali',demo_url:'https://youtu.be/dQw4w9WgXcQ',category:'university',round_code:'2027-01',status:'submitted',payment_status:'unpaid',phase:'demo'}];
 const requests=[];
 await page.route('**/api/e2e/**',async route=>{
  const u=new URL(route.request().url()),path=u.pathname.split('/').pop(),method=route.request().method();
  const body=method==='POST'?route.request().postDataJSON():null;let result={ok:true};
  if(path==='me')result={ok:true,account:{id:'test-member',role:'member'}};
  else if(path==='applications'&&method==='GET')result={ok:true,applications:entries};
  else if(path==='update-application'){requests.push(body);entries=entries.map(e=>e.id===body.application_id?{...e,...body}:e);result={ok:true}}
  else if(path==='delete-application'){requests.push(body);entries=[];result={ok:true}}
  else if(path==='logout'){result={ok:true}};
  await route.fulfill({status:200,json:result});
 });
 await page.goto('/member.html#login');
 await expect(page.locator('#entries')).toContainText('TEST Singer');
 await expect(page.locator('#entries')).toContainText('尚未完成模擬付款');
 await page.locator('#entries button').filter({hasText:'修改資料'}).click();
 await page.locator('[data-editing] [name=song_title]').fill('TEST Revised');
 await page.locator('[data-editing] button[type=submit]').click();
 await expect(page.locator('#entries')).toContainText('TEST Revised');
 expect(requests[0].application_id).toBe('SYNTH-123');
 page.on('dialog',d=>d.accept());
 await page.locator('#entries button').filter({hasText:'刪除此筆'}).click();
 await expect(page.locator('#entries')).toContainText('目前還沒有報名資料');
 expect(requests[1].application_id).toBe('SYNTH-123');
});
