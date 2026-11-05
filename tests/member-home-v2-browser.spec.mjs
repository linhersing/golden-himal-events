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
  if(key==='me')result={ok:true,account:{id:'SYNTH-MEMBER-ACCOUNT',role:'member',available_roles:['member']},profile_enabled:false};
  else if(key==='applications'&&method==='GET')result={ok:true,applications:state.entries};
  else if(key==='update-application'&&method==='POST'){
   const payload=route.request().postDataJSON();
   writes.push(payload);
   state.entries=state.entries.map(e=>e.id===payload.application_id?{...e,...payload}:e);
   result={ok:true,application_id:payload.application_id};
  }
  else if(key==='logout')result={ok:true};
  await route.fulfill({status,json:result});
 });
 return writes;
}
test('homepage keeps same URLs but switches to personal home after confirmed server session and saved application',async({page})=>{
 const state={entries:[{...entry}]};await mockMemberApi(page,state);
 await page.goto('/');
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
 await page.goto('/');
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
 await expect(page.locator('#entries')).toContainText('已開始評分');
 await expect(page.locator('#member-view-video')).toBeVisible();
 await expect(page.locator('#member-show-details')).toBeVisible();
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
 await page.goto('/');
 await expect(page.locator('#home-login')).toBeVisible();
 await expect(page.locator('#home-apply')).toContainText('我要報名');
 expect(posts).toBe(0);
});
