import {test,expect} from '@playwright/test';

const mockPhoto=page=>page.route('https://images.example.org/**',r=>r.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12"></svg>'}));

test('member profile form is opt-in and appears only when D1 profile feature is ready',async({page})=>{
 await mockPhoto(page);
 const member={ok:true,account:{id:'test-member',role:'member',available_roles:['member']},profile_enabled:true};
 await page.route('**/api/e2e/**',async route=>{
  const p=new URL(route.request().url()).pathname.split('/').pop();
  const payload=p==='me'?member:p==='applications'?{ok:true,applications:[]}:{ok:true};
  await route.fulfill({status:200,json:payload});
 });
 await page.setViewportSize({width:375,height:812});
 await page.goto('/member.html#register');
 await expect(page.locator('#member-panel')).toBeVisible();
 await page.locator('#start-application').click();
 await expect(page.locator('#entrant-profile-fields')).toBeVisible();
 await page.locator('#profile-gender').selectOption('female');
 await page.locator('#entrant-photo-url-1').fill('https://images.example.org/alice.jpg');
 await expect(page.locator('#entrant-photo-preview img')).toHaveAttribute('src','https://images.example.org/alice.jpg');
 await expect(page.locator('#entrant-profile-consent')).toHaveAttribute('required','');
 for(const width of [320,375,390]){
  await page.setViewportSize({width,height:812});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
 }
 await page.screenshot({path:'test-results/ghv-entrant-profile/entrant-mobile.png',fullPage:true});
});
test('profile form stays hidden when profile D1 schema/flag has not been enabled',async({page})=>{
 await page.route('**/api/e2e/**',async route=>{
  const p=new URL(route.request().url()).pathname.split('/').pop();
  await route.fulfill({status:200,json:p==='me'?{ok:true,account:{id:'test-member',role:'member'},profile_enabled:false}:{ok:true,applications:[]}});
 });
 await page.goto('/member.html#register');
 await page.locator('#start-application').click();
 await expect(page.locator('#entrant-profile-fields')).toBeHidden();
 await expect(page.locator('#application-form [name=stage_name]')).toBeVisible();
});
test('staff photo thumbnails are bound by application, with three links only on selected entrant detail',async({page})=>{
 await mockPhoto(page);
 const records=[
  {id:'A-001',stage_name:'Alice Test',song_title:'Nepali demo',song_language:'Nepali',category:'community',round_code:'2027-01',phase:'demo',photo_url_1:'https://images.example.org/alice.jpg',photo_url_2:'https://images.example.org/alice2.jpg',gender:'female',demo_url:'https://youtu.be/test1',demo_technique:null,demo_interpretation:null},
  {id:'B-002',stage_name:'Bob Test',song_title:'English demo',song_language:'English',category:'university',round_code:'2027-01',phase:'demo',photo_url_1:'https://images.example.org/bob.jpg',gender:'male',demo_url:'https://youtu.be/test2',demo_technique:null,demo_interpretation:null}
 ];
 await page.route('**/api/e2e/**',async route=>{
  const p=new URL(route.request().url()).pathname.split('/').pop();
  const value=p==='me'?{ok:true,account:{id:'reviewer',role:'reviewer',available_roles:['reviewer']}}:
   p==='reviewer-queue'?{ok:true,queue:records}:{ok:true};
  await route.fulfill({status:200,json:value});
 });
 await page.setViewportSize({width:375,height:812});
 await page.goto('/backoffice.html');
 await expect(page.locator('#judge-list .roster-entry')).toHaveCount(2);
 await expect(page.locator('#judge-list img')).toHaveCount(2);
 const imgs=await page.locator('#judge-list img').evaluateAll(xs=>xs.map(x=>x.getAttribute('src')));
 expect(imgs).toEqual(['https://images.example.org/alice.jpg','https://images.example.org/bob.jpg']);
 await page.locator('#judge-list .roster-entry').first().click();
 await expect(page.locator('#judge-detail .entrant-gallery-img')).toHaveCount(2);
 await expect(page.locator('#judge-detail')).toContainText('女');
 await expect(page.locator('#judge-detail')).not.toContainText('bob.jpg');
 await page.screenshot({path:'test-results/ghv-entrant-profile/reviewer-detail-mobile.png',fullPage:true});
});
