import {test,expect} from '@playwright/test';

const entry={
 id:'SYNTH-MEMBER-001',stage_name:'TEST Singer 001',song_title:'Nepali Song',
 original_artist:'TEST Artist',song_language:'Nepali',
 category:'community',round_code:'2027-01',phase:'demo',status:'under_review',
 payment_status:'simulated_paid',can_edit:1,
 demo_url:'https://youtu.be/dQw4w9WgXcQ'
};
async function mockMemberApi(page,state){
 const writes=[];
 await page.route('**/api/e2e/**',async route=>{
  const url=new URL(route.request().url()),key=url.pathname.split('/').pop(),
   method=route.request().method();
  let result={ok:true},status=200;
  if(key==='me')result={ok:true,account:{id:'SYNTH-MEMBER-ACCOUNT',role:'member',available_roles:['member']},profile_enabled:state.profileEnabled??false,nepal_locations_enabled:state.locationsEnabled??false};
  else if(key==='applications'&&method==='GET')result={ok:true,applications:state.entries,next_audition_round:state.nextAudition};
  else if(key==='submit-video-supplement'&&method==='POST'){
   const payload=route.request().postDataJSON();
   writes.push(payload);
   state.entries=state.entries.map(e=>e.id===payload.application_id?{...e,demo_url:payload.demo_url,video_supplement_state:'submitted'}:e);
   result={ok:true,application_id:payload.application_id,testOnly:true};
  }
  else if(key==='update-application'&&method==='POST'){
   const payload=route.request().postDataJSON();
   writes.push(payload);
   const stored={...payload};
   for(const key of ['stage_name','song_title','original_artist','song_language','demo_url'])stored[key]=stored[key].trim();
   if(state.profileEnabled){
    stored.gender=stored.gender||null;
    for(const key of ['photo_url_1','photo_url_2','photo_url_3'])stored[key]=stored[key]?new URL(stored[key]).href:null;
   }
   state.entries=state.entries.map(e=>e.id===payload.application_id?{...e,...stored}:e);
   result={ok:true,application_id:payload.application_id};
  }
  else if(key==='logout')result={ok:true};
  await route.fulfill({status,json:result});
 });
 return writes;
}
test('member form supports the seven provinces when the database capability is ready',async({page})=>{
 await mockMemberApi(page,{entries:[],locationsEnabled:true});
 await page.setViewportSize({width:375,height:820});
 await page.goto('/member.html#register');
 const field=page.locator('#application-form select[name=province]');
 await expect(field.locator('option:not(:disabled)')).toHaveCount(7);
 await field.selectOption('karnali');
 await expect(field).toHaveValue('karnali');
 const location=page.locator('#entrant-location-detail input');
 await expect(location).toBeVisible();
 await expect(location).toHaveJSProperty('required',true);
});

test('April audition remains invisible until explicitly enabled in the member API',async({page})=>{
 await mockMemberApi(page,{entries:[{...entry}],nextAudition:null});
 await page.goto('/member.html#login');
 await expect(page.locator('#new-application-callout')).toBeHidden();
 await expect(page.locator('#application-form option[value="2027-04"]')).toHaveJSProperty('disabled',true);
 await expect(page.locator('#member-quick-edit')).toBeVisible();
});

test('April audition opens from the member home and keeps the original category',async({page})=>{
 const state={entries:[{...entry}],nextAudition:'2027-04'};
 await mockMemberApi(page,state);
 await page.goto('/member.html#login');
 await page.getByRole('button',{name:'報名第二梯次'}).click();
 await expect(page.locator('#application-form [name=round_code]')).toHaveValue('2027-04');
 await expect(page.locator('#application-form [name=category]')).toHaveValue('community');
 await expect(page.locator('#application-form [name=category] option[value=university]')).toHaveJSProperty('disabled',true);
 state.nextAudition=null;state.entries[0].phase='final';
 await page.reload();
 await expect(page.locator('#member-welcome-name')).toContainText('TEST Singer');
 await expect(page.locator('#start-application')).toBeHidden();
});

test('member sends a replacement link and sees the saved state',async({page})=>{
 const state={entries:[{...entry,can_edit:0,video_supplement_state:'pending',video_supplement_deadline:1820000000}]};
 const writes=await mockMemberApi(page,state);
 await page.setViewportSize({width:375,height:820});
 await page.goto('/member.html#login');
 const entries=page.locator('#entries');
 await expect(entries).toContainText('尼泊爾時間');
 await entries.locator('input[name=demo_url]').fill('https://youtu.be/test-replacement');
 await entries.getByRole('button',{name:'送出補正資料'}).click();
 await expect(entries).toContainText('補正資料已儲存');
 await expect(entries.locator('input[name=demo_url]')).toHaveCount(0);
 expect(writes).toEqual([{application_id:entry.id,demo_url:'https://youtu.be/test-replacement'}]);
});
test('homepage keeps same URLs but switches to personal home after confirmed server session and saved application',async({page})=>{
 const state={entries:[{...entry}]};await mockMemberApi(page,state);
 await page.goto('/voice.html');
 await expect(page.locator('#home-apply')).toContainText('我的參賽首頁');
 await expect(page.locator('#home-apply')).toHaveAttribute('href','./member.html#register');
 await expect(page.locator('#home-login')).toHaveAttribute('href','./member.html#login');
 await expect(page.locator('#home-login')).toBeHidden();
 await expect(page.locator('.front-actions a[href="./news.html"]')).toBeVisible();
 await page.locator('[data-lang="en"]').click();
 await expect(page.locator('#home-apply')).toContainText('My singer home');
 await page.locator('[data-lang="zh"]').click();
 await expect(page.locator('#home-apply')).toContainText('我的參賽首頁');
});
test('unregistered member has separate start and member links, without changing their URL',async({page})=>{
 const state={entries:[]};await mockMemberApi(page,state);
 await page.goto('/voice.html');
 await expect(page.locator('#home-apply')).toContainText('開始報名');
 await expect(page.locator('#home-login')).toContainText('我的會員專區');
 await expect(page.locator('#home-apply')).toHaveAttribute('href','./member.html#register');
 await expect(page.locator('#home-login')).toHaveAttribute('href','./member.html#login');
 await expect(page.locator('.front-actions a')).toHaveCount(3);
});
test('member home shows two statuses, edit after simulated checkout and true readback across reload',async({page})=>{
 const state={entries:[{...entry}]},writes=await mockMemberApi(page,state);
 await page.setViewportSize({width:1280,height:850});
 await page.goto('/member.html#login');
 await expect(page.locator('#member-welcome-name')).toContainText('TEST Singer 001');
 await expect(page.locator('#member-state-data')).toContainText('測試資料已儲存');
 await expect(page.locator('#member-state-payment')).toContainText('模擬付款');
 await expect(page.locator('#member-official-boundary')).toContainText('不代表正式報名成功');
 await expect(page.locator('#member-quick-edit')).toBeVisible();
 await expect(page.locator('#member-primary-actions')).toBeVisible();
 await expect(page.locator('#application-details')).toBeHidden();
 await page.screenshot({path:'test-results/ghv-member-home-v2/member-home-desktop.png',fullPage:true});
 await page.locator('#member-quick-edit').click();
 await expect(page.locator('#member-edit-panel form')).toBeVisible();
 await page.locator('#member-edit-panel [name=stage_name]').fill('TEST Singer Revised');
 await page.locator('#member-edit-panel [name=song_title]').fill('English Song Revised');
 await page.locator('#member-edit-panel [name=song_language]').selectOption('English');
 await page.locator('#member-edit-panel button[type=submit]').click();
 await expect(page.locator('#member-welcome-name')).toHaveText('TEST Singer Revised');
 await expect(page.locator('#entries')).toContainText('English Song Revised');
 expect(writes).toHaveLength(1);
 expect(writes[0]).toMatchObject({application_id:entry.id,stage_name:'TEST Singer Revised',song_title:'English Song Revised',song_language:'English'});
 await page.reload();
 await expect(page.locator('#member-welcome-name')).toHaveText('TEST Singer Revised');
 await expect(page.locator('#entries')).toContainText('English');
 for(const width of [320,375,390,414]){
  await page.setViewportSize({width,height:830});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
 }
 await page.screenshot({path:'test-results/ghv-member-home-v2/member-home-mobile.png',fullPage:true});
});
test('member dashboard locks edit button when first judge score exists',async({page})=>{
 const state={entries:[{...entry,can_edit:0}]};await mockMemberApi(page,state);
 await page.goto('/member.html#login');
 await expect(page.locator('#member-quick-edit')).toBeHidden();
 await expect(page.locator('#member-edit-lock-reason')).toBeVisible();
 await expect(page.locator('#member-edit-lock-reason')).toContainText('已開始評分');
 await expect(page.locator('#entries')).toContainText('已開始評分');
 await expect(page.locator('#member-view-video')).toBeVisible();
 await expect(page.locator('#member-show-details')).toBeVisible();
});
test('edit succeeds when the server trims text and canonicalizes an optional photo URL',async({page})=>{
 const state={entries:[{...entry}],profileEnabled:true};
 const writes=await mockMemberApi(page,state);
 await page.route('https://example.org/',route=>route.fulfill({
  contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>'
 }));
 await page.setViewportSize({width:390,height:830});
 await page.goto('/member.html#login');
 await page.locator('#member-quick-edit').click();
 const form=page.locator('#member-edit-panel form');
 await form.locator('[name=stage_name]').fill('  TEST Revised Singer  ');
 await form.locator('[name=photo_url_1]').fill('https://EXAMPLE.org');
 await form.locator('[name=profile_consent]').check();
 await form.locator('button[type=submit]').click();
 await expect(page.locator('#member-welcome-name')).toHaveText('TEST Revised Singer');
 await expect(form).toBeHidden();
 expect(writes).toHaveLength(1);
 await page.reload();
 await expect(page.locator('#member-welcome-name')).toHaveText('TEST Revised Singer');
 await expect(page.locator('#member-hero-avatar img')).toHaveAttribute('src','https://example.org/');
});
test('homepage remains anonymous when authorization is missing; staff role cannot be switched by home',async({page})=>{
 let posts=0;
 await page.route('**/api/e2e/**',async route=>{
  if(route.request().method()==='POST')posts++;
  const key=new URL(route.request().url()).pathname.split('/').pop();
  const result=key==='me'?{ok:true,account:{id:'STAFF',role:'organizer',available_roles:['member','organizer']}}:
   {ok:false,error:'not_authorized'};
  await route.fulfill({status:key==='me'?200:403,json:result});
 });
 await page.goto('/voice.html');
 await expect(page.locator('#home-login')).toBeVisible();
 await expect(page.locator('#home-apply')).toContainText('我要報名');
 expect(posts).toBe(0);
});
