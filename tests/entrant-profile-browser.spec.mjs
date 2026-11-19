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
test('organizer loads only the selected entrant photo; reviewer workspace omits profile data',async({page})=>{
 await mockPhoto(page);
 const records=[
  {id:'A-001',stage_name:'Alice Test',song_title:'Nepali demo',song_language:'Nepali',category:'community',round_code:'2027-01',phase:'demo',demo_url:'https://youtu.be/test1',demo_technique:null,demo_interpretation:null},
  {id:'B-002',stage_name:'Bob Test',song_title:'English demo',song_language:'English',category:'university',round_code:'2027-01',phase:'demo',demo_url:'https://youtu.be/test2',demo_technique:null,demo_interpretation:null}
 ];
 const profiles=[
  {id:'A-001',photo_url_1:'https://images.example.org/alice.jpg',photo_url_2:'https://images.example.org/alice2.jpg'},
  {id:'B-002',photo_url_1:'https://images.example.org/bob.jpg'}
 ];
 let role='organizer';
 const profileReads=[];
 await page.route('**/api/e2e/**',async route=>{
  const url=new URL(route.request().url()),p=url.pathname.split('/').pop();
  let value={ok:true};
  if(p==='me')value={ok:true,account:{id:role,role,available_roles:[role]}};
  if(p==='organizer-queue'&&url.searchParams.get('view')==='profile'){
   const id=url.searchParams.get('id');
   profileReads.push({id,role});
   value={ok:true,profile:profiles.find(item=>item.id===id)};
  }else if(p==='organizer-queue')value={ok:true,applications:records};
  else if(p==='reviewer-queue')value={ok:true,queue:records};
  await route.fulfill({status:200,json:value});
 });
 await page.setViewportSize({width:375,height:812});
 await page.goto('/backoffice.html');
 await expect(page.locator('#admin-apps .organizer-record-row')).toHaveCount(2);
 await expect(page.locator('#admin-apps img')).toHaveCount(0);
 expect(profileReads).toHaveLength(0);
 await page.locator('#admin-apps .organizer-record-open').first().click();
 await page.locator('#organizer-entry-content').getByRole('button',{name:/基本資料與照片/}).click();
 const gallery=page.locator('#organizer-entry-content .entrant-gallery-img');
 await expect(gallery).toHaveCount(2);
 const urls=await gallery.evaluateAll(images=>images.map(image=>image.getAttribute('src')));
 expect(urls).toEqual(['https://images.example.org/alice.jpg','https://images.example.org/alice2.jpg']);
 expect(profileReads).toEqual([{id:'A-001',role:'organizer'}]);
 await page.locator('#organizer-entry-close').click();
 await expect(gallery).toHaveCount(0);
 role='reviewer';
 await page.reload();
 await expect(page.locator('#judge-list .roster-entry')).toHaveCount(2);
 await expect(page.locator('#judge-list img')).toHaveCount(0);
 await page.locator('#judge-list .roster-entry').first().click();
 await page.locator('#judge-queue [data-song-position="1"]').click();
 await expect(page.locator('#judge-detail .entrant-gallery-img')).toHaveCount(0);
 expect(profileReads).toEqual([{id:'A-001',role:'organizer'}]);
});
