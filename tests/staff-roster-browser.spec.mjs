import {test,expect} from '@playwright/test';

test('organizer explicitly approves a test entry and member sees pending until approval',async({page})=>{
 let approval='pending',role='member';
 const entry={id:'QA-TEST-ENTRY',stage_name:'QA TEST Singer',song_title:'QA Test Song',song_language:'Nepali',
  round_code:'2027-01',category:'community',payment_status:'simulated_paid',status:'under_review'};
 await page.route('**/api/e2e/**',async route=>{
  const path=new URL(route.request().url()).pathname.split('/').at(-1);
  if(path==='me')return route.fulfill({json:{ok:true,account:{role,available_roles:[role]},approval_enabled:true}});
  if(path==='applications'||path==='organizer-queue')return route.fulfill({json:{ok:true,applications:[{...entry,approval_state:approval,can_edit:approval==='pending'}]}});
  if(path==='approve-test-application'){
   expect(role).toBe('organizer');expect(route.request().postDataJSON()).toEqual({application_id:entry.id});
   approval='approved';return route.fulfill({json:{ok:true,approval_state:approval,testOnly:true}});
  }
  return route.fulfill({json:{ok:true,mode:'invited',enabled:false}});
 });
 await page.goto('/member.html');await page.locator('[data-lang=zh]').click();
 await expect(page.locator('#test-completion')).toContainText('等待主辦方核准');
 role='organizer';await page.goto('/backoffice.html');
 await expect(page.locator('#admin-apps')).toContainText('待主辦核准');
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'核准測試報名'}).click();
 await expect(page.locator('#admin-apps')).toContainText('主辦已核准');
 await expect(page.locator('#paid-count')).toHaveText('0');
 role='member';await page.goto('/member.html');
 await expect(page.locator('#test-completion')).toContainText('主辦方已核准測試報名');
});

function fakeQueue(n=135){
 return Array.from({length:n},(_,i)=>({
  id:'SYNTH-'+String(i+1).padStart(3,'0'),stage_name:'EXAMPLE Singer '+String(i+1).padStart(3,'0'),
  song_title:i%2?'English song':'Nepali song',song_language:i%2?'English':'Nepali',
  category:i%2?'university':'community',round_code:'2027-01',
  demo_url:'https://youtu.be/example',phase:'demo',payment_status:'simulated_paid',
  demo_technique:null,demo_interpretation:null
 }));
}
test('reviewer can page through 135 synthetic entries, open one form and score only that entry',async({page})=>{
 const entries=fakeQueue();const posts=[];
 await page.route('**/api/e2e/**',async route=>{
  const key=new URL(route.request().url()).pathname.split('/').pop();
  let response={ok:true};
  if(key==='me')response={ok:true,account:{id:'reviewer-1',role:'reviewer',available_roles:['reviewer']}};
  else if(key==='reviewer-queue')response={ok:true,queue:entries};
  else if(key==='score'){const data=route.request().postDataJSON();posts.push(data);const a=entries.find(x=>x.id===data.application_id);a.demo_technique=data.technique;a.demo_interpretation=data.interpretation;response={ok:true,score:data.technique+data.interpretation};}
  await route.fulfill({status:200,json:response});
 });
 await page.setViewportSize({width:1280,height:900});await page.goto('/backoffice.html');
 await expect(page.locator('#judge-list .roster-entry')).toHaveCount(10);
 await expect(page.locator('#judge-count')).toContainText('135');
 await expect(page.locator('#judge-detail')).toBeHidden();
 await page.screenshot({path:'test-results/ghv-staff-roster/reviewer-desktop-list.png',fullPage:true});
 await page.locator('#judge-pagination button').last().click();
 await expect(page.locator('#judge-pagination')).toContainText('2 / 14');
 await page.locator('#judge-search').fill('EXAMPLE Singer 125');
 await expect(page.locator('#judge-list .roster-entry')).toHaveCount(1);
 await page.locator('#judge-list .roster-entry').click();
 await expect(page.locator('#judge-roster-panel')).toBeHidden();
 await expect(page.locator('#judge-queue form')).toBeVisible();
 await page.locator('#judge-queue [name=technique]').fill('50');
 await page.locator('#judge-queue [name=interpretation]').fill('35');
 await page.locator('#judge-queue [name=conflict]').check();
 await page.locator('#judge-queue button[type=submit]').click();
 await expect(page.locator('#judge-roster-panel')).toBeVisible();
 expect(posts).toHaveLength(1);
 expect(posts[0]).toMatchObject({application_id:'SYNTH-125',technique:50,interpretation:35,no_conflict:true});
 await page.locator('#judge-status').selectOption('scored');
 await expect(page.locator('#judge-list .roster-entry')).toHaveCount(1);
 await expect(page.locator('#judge-list')).toContainText('已評分');
 await page.locator('#judge-list .roster-entry').click();
 await expect(page.locator('#judge-queue form')).toHaveCount(0);
 await page.locator('#judge-back-list').click();
 for(const width of [320,375]){
  await page.setViewportSize({width,height:820});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
 }
 await page.screenshot({path:'test-results/ghv-staff-roster/reviewer-mobile-375.png',fullPage:true});
});
test('organizer filters language, category and scoring with 133 synthetic entries',async({page})=>{
 const entries=Array.from({length:133},(_,i)=>({
  id:'ENTRY-'+String(i+1).padStart(3,'0'),stage_name:'Singer '+String(i+1).padStart(3,'0'),
  song_title:'Song '+String(i+1),song_language:i%2?'English':'Nepali',
  category:i%2?'university':'community',round_code:'2027-01',
  status:'submitted',payment_status:i%3===0?'simulated_paid':'unpaid',
  demo_judges:i%4===0?1:0,live_judges:0,demo_mean:null
 }));
 await page.route('**/api/e2e/**',async route=>{
  const key=new URL(route.request().url()).pathname.split('/').pop();
  const data=key==='me'?{ok:true,account:{id:'organizer-1',role:'organizer',available_roles:['organizer']}}:
  key==='organizer-queue'?{ok:true,applications:entries}:{ok:true};
  await route.fulfill({status:200,json:data});
 });
 await page.setViewportSize({width:1280,height:900});await page.goto('/backoffice.html');
 await expect(page.locator('#organizer-dashboard')).toBeVisible();
 await expect(page.locator('#pending-count')).toHaveText('133');
 await expect(page.locator('#paid-count')).toHaveText('0');
 await expect(page.locator('#admin-apps .roster-entry')).toHaveCount(12);
 await page.locator('#organizer-language').selectOption('English');
 await expect(page.locator('#organizer-count')).toContainText('66 筆');
 await page.locator('#organizer-category').selectOption('university');
 await expect(page.locator('#organizer-count')).toContainText('66 筆');
 await page.locator('#organizer-search').fill('ENTRY-120');
 await expect(page.locator('#admin-apps .roster-entry')).toHaveCount(1);
 await expect(page.locator('#admin-apps')).toContainText('ENTRY-120');
 await page.screenshot({path:'test-results/ghv-staff-roster/organizer-desktop.png',fullPage:true});
 await page.setViewportSize({width:375,height:850});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
 await page.screenshot({path:'test-results/ghv-staff-roster/organizer-mobile-375.png',fullPage:true});
});

for(const [device,width] of [['desktop',1280],['mobile',375]]){
 test('organizer can search, edit, disable, delete, restore and read audit on '+device,async({page})=>{
  let row={id:'11111111-2222-4333-8444-555555555555',stage_name:'Fictional Singer',affiliation:'Fictional School',state:'active',version:0,updated_at:1,protected:0};
  const events=[];
  await page.setViewportSize({width,height:900});
  page.on('dialog',dialog=>dialog.accept());
  await page.route('**/api/e2e/**',route=>{
   const url=new URL(route.request().url()),path=url.pathname.split('/').pop();
   let json={ok:true};
   if(path==='me')json={ok:true,account:{id:'organizer-fictional',role:'organizer',available_roles:['organizer']}};
   if(path==='staff-login-config')json={ok:true,required:false};
   if(path==='organizer-queue')json={ok:true,applications:[],registration_management_enabled:true};
   if(path==='organizer-registrations'){
    const filter=url.searchParams.get('state'),query=url.searchParams.get('q');
    json={ok:true,registrations:(filter==='all'||filter===row.state)&&(!query||row.stage_name.includes(query))?[row]:[],next_offset:null};
   }
   if(path==='organizer-registration-action'){
    const {action,version,updated_at,stage_name,affiliation}=route.request().postDataJSON();
    expect(version).toBe(row.version);expect(updated_at).toBe(row.updated_at);
    row={...row,version:version+1,updated_at:updated_at+1,state:{edit:'active',disable:'disabled',delete:'deleted',restore:'active'}[action]};
    if(action==='edit')row={...row,stage_name,affiliation};
    events.unshift({action,result:'success',actor_id:'organizer-fictional',occurred_at:1700000000,diff:action==='edit'?{stage_name:['[redacted]','[redacted]']}:{state:['active',row.state]}});
    json={ok:true,audit_id:'test-'+version,registration:row};
   }
   if(path==='organizer-registration-audit')json={ok:true,events};
   return route.fulfill({json});
  });
  await page.goto('/backoffice.html');
  const panel=page.locator('#organizer-admin-registrations'),search=panel.getByRole('button',{name:'查詢'}),filter=panel.getByLabel('資料狀態');
  const cards=panel.locator('#admin-registration-list');
  await panel.locator('summary').first().click();
  await expect(cards).toContainText('Fictional Singer');
  await panel.getByLabel('搜尋姓名、曲目或編號').fill('Fictional');
  await search.click();
  await cards.getByText('修改報名資料',{exact:true}).click();
  await cards.getByLabel('選手姓名').fill('Fictional Singer Edited');
  await cards.getByLabel('學校／職業').fill('Fictional Studio');
  await cards.getByRole('button',{name:'儲存修改'}).click();
  await expect(cards).toContainText('Fictional Singer Edited');
  await filter.selectOption('all');
  await search.click();
  await cards.getByRole('button',{name:'停用報名'}).click();
  await expect(cards).toContainText('已停用');
  await cards.getByRole('button',{name:'移至回收區'}).click();
  await expect(cards).toContainText('已刪除，可復原');
  await cards.getByRole('button',{name:'復原報名'}).click();
  await expect(cards).toContainText('有效');
  await cards.getByText('操作紀錄',{exact:true}).click();
  await expect(cards).toContainText('organizer-fictional');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  await panel.screenshot({path:'test-results/admin-security/'+device+'.png'});
 });
}
