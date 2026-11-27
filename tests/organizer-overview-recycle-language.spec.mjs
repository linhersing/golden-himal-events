import {overviewOf} from './fixtures/organizer-overview.mjs';
import {test,expect} from '@playwright/test';

test('organizer entry review totals are consistent and three languages update in place',async({page})=>{
 const entries=[
  {id:'a1',stage_name:'TEST Singer A',approval_state:'pending'},
  {id:'a2',stage_name:'TEST Singer B',approval_state:'approved',video_supplement_state:'pending'},
  {id:'a3',stage_name:'TEST Singer C',approval_state:'approved'},
  {id:'a4',stage_name:'TEST Singer D',approval_state:'approved'},
  {id:'a5',stage_name:'TEST Singer E',approval_state:'pending',video_supplement_state:'pending'}
 ].map(x=>({...x,round_code:'2027-01',phase:'demo',category:'university',competition_region:'A',demo_entries:[]}));
 await page.route('**/api/e2e/**',route=>{
  const key=new URL(route.request().url()).pathname.split('/').at(-1);
  const json=key==='me'?{ok:true,account:{id:'test-organizer',role:'organizer',available_roles:['organizer']},judging_policy:{mode:'final_only'}}
  :key==='organizer-queue'?{ok:true,applications:entries,overview:overviewOf(entries),registration_management_enabled:true,judging_policy:{mode:'final_only'}}
  :key==='organizer-corrections'?{ok:true,enabled:true,requests:[]}
  :key==='organizer-registrations'?{ok:true,registrations:[],next_offset:null}:{ok:true};
  return route.fulfill({json});
 });
 await page.goto('/backoffice.html');
 await page.locator('[data-lang=zh]').click();
 await expect(page.locator('#staff-management-open')).toBeVisible();
 await expect(page.locator('#staff-trash-open')).toBeVisible();
 const actions=await page.locator('#staff-management-actions').boundingBox();
 const roster=await page.locator('#admin-apps').boundingBox();
 expect(actions.y+actions.height).toBeLessThan(roster.y);

 for(const [id,value] of [['pending-count','5'],['organizer-pending-count','1'],['organizer-supplement-count','2'],['organizer-approved-count','2']])
  await expect(page.locator('#'+id)).toHaveText(value);
 await expect(page.locator('[data-correction-count]')).toHaveText('待處理修改申請 0 筆');
 await page.locator('[data-overview-filter=pending]').click();
 await expect(page.locator('#organizer-count')).toContainText('1 / 5');
 await page.locator('[data-overview-filter=supplement]').click();
 await expect(page.locator('#organizer-count')).toContainText('2 / 5');
 for(const [lang,title,trash] of [['en','Entry review overview','Recycle bin'],['ne','आवेदन समीक्षा सारांश','रिसाइकल बिन'],['zh','報名工作總覽','資源回收桶']]){
  await page.locator('[data-lang='+lang+']').click();
  await expect(page.locator('#organizer-overview-title')).toHaveText(title);
  await expect(page.locator('#organizer-review-chart-title')).toHaveText({
   en:'Entries by review status',ne:'समीक्षा अवस्थाअनुसार आवेदन',zh:'報名審核分布'
  }[lang]);
  await expect(page.locator('[data-review-state=supplement] dd')).toContainText('%');
  await expect(page.locator('[data-region=A] progress')).toHaveJSProperty('value',5);
  await expect(page.locator('[data-region=B] progress')).toHaveJSProperty('value',0);
  await expect(page.locator('#staff-trash-open')).toHaveText(trash);
  await expect(page.locator('#organizer-approved-count')).toHaveText('2');
  await expect(page.locator('#organizer-count')).toContainText('2 / 5');
 }
 await page.locator('#staff-trash-open').click();
 await expect(page.locator('#admin-registration-search select[name=state]')).toHaveValue('deleted');
 await expect(page.locator('#admin-registration-results')).toHaveText('資源回收桶目前沒有資料。');
});


test('review actions distinguish normal pending, correction open, expired and submitted',async({page})=>{
 const entries=[
 {id:'normal',stage_name:'Normal TEST',approval_state:'pending',video_supplement_available:1},
 {id:'expired',stage_name:'Expired TEST',approval_state:'pending',video_supplement_state:'expired',video_supplement_deadline:1700000000},
 {id:'open',stage_name:'Open TEST',approval_state:'pending',video_supplement_state:'pending',video_supplement_deadline:1893456000},
 {id:'submitted',stage_name:'Submitted TEST',approval_state:'pending',video_supplement_state:'submitted'}
 ].map(x=>({...x,round_code:'2027-01',phase:'demo',category:'university',demo_entries:[]}));
 await page.route('**/api/e2e/**',route=>{
  const key=new URL(route.request().url()).pathname.split('/').at(-1);
  if(key==='approve-test-application'){
   const id=route.request().postDataJSON().application_id;
   expect(id).toBe('submitted');entries.find(e=>e.id===id).approval_state='approved';
   return route.fulfill({json:{ok:true,testOnly:true,approval_state:'approved'}});
  }
  return route.fulfill({json:key==='me'?{ok:true,account:{id:'test-organizer',role:'organizer',available_roles:['organizer']}}:key==='organizer-queue'?{ok:true,applications:entries,overview:overviewOf(entries)}: {ok:true}});
 });
 await page.goto('/backoffice.html');await page.locator('[data-lang=zh]').click();
 await expect(page.locator('#organizer-pending-count')).toHaveText('2');
 await expect(page.locator('#organizer-supplement-count')).toHaveText('1');
 await expect(page.locator('#organizer-expired-count')).toHaveText('1');
 await page.locator('[data-overview-filter=supplement]').click();
 await expect(page.locator('[data-application-id="open"]')).toBeVisible();
 await expect(page.locator('[data-application-id="expired"]')).toHaveCount(0);
 await page.locator('[data-overview-filter=expired]').click();
 await expect(page.locator('[data-application-id="expired"]')).toBeVisible();
 await expect(page.locator('[data-application-id="open"]')).toHaveCount(0);
 for(const [lang,label] of [['en','Correction deadline expired'],['ne','सुधारको समय सकियो'],['zh','補件已逾期']]){
  await page.locator('[data-lang='+lang+']').click();
  await expect(page.locator('[data-overview-filter=expired]')).toContainText(label);
  await expect(page.locator('[data-application-id="expired"]')).toBeVisible();
 }
 await page.locator('[data-overview-filter=""]').click();
 const detail=page.locator('#organizer-entry-content');
 for(const [id,label,approve,request] of [['normal','待審核',true,true],['expired','補件已逾期',false,false],['open','待補件',false,false],['submitted','待審核',true,false]]){
  await page.locator('[data-application-id="'+id+'"]').click();
  await detail.getByRole('button',{name:/報名審核與補件/}).click();
  await expect(detail).toContainText(label);
  await expect(detail.getByRole('button',{name:'核准測試報名',exact:true})).toHaveCount(approve?1:0);
  await expect(detail.getByRole('button',{name:'開放 48 小時補件',exact:true})).toHaveCount(request?1:0);
  if(id==='expired')await expect(detail).toContainText('系統禁止直接核准');
  if(id==='submitted'){
   page.once('dialog',d=>d.accept());
   await detail.getByRole('button',{name:'核准測試報名',exact:true}).click();
   await expect(detail).toContainText('已核准');
  }
  await page.locator('#organizer-entry-close').click();
  await expect(page.locator('#admin-apps')).toBeVisible();
 }
 await expect(page.locator('#organizer-approved-count')).toHaveText('1');
 await expect(page.locator('#organizer-pending-count')).toHaveText('1');
});


test('failed full database statistics never display a zero total',async({page})=>{
 await page.route('**/api/e2e/**',route=>{
  const key=new URL(route.request().url()).pathname.split('/').at(-1);
  if(key==='organizer-queue')return route.fulfill({status:503,json:{ok:false,error:'test_data_unavailable'}});
  return route.fulfill({json:key==='me'?{ok:true,account:{id:'test-organizer',role:'organizer'}}:{ok:true}});
 });
 await page.goto('/backoffice.html');
 await expect(page.locator('#organizer-overview-error')).toBeVisible();
 await expect(page.locator('#pending-count')).toHaveText('—');
 await expect(page.locator('#organizer-charts')).toBeHidden();
});

test('an expired record beyond the first 500 is reached from the statistics card',async({page})=>{
 const first={id:'first',stage_name:'First TEST',approval_state:'pending'};
 const expired={id:'expired-after-limit',stage_name:'Expired TEST',approval_state:'pending',video_supplement_state:'expired'};
 const overview={total:501,status:{pending:500,supplement:0,expired:1,approved:0,unverified:0},regions:{A:250,B:250,other:1}};
 await page.route('**/api/e2e/**',route=>{
  const {pathname,searchParams}=new URL(route.request().url());
  const key=pathname.split('/').at(-1);
  if(key==='organizer-queue')return route.fulfill({json:{ok:true,overview,applications:searchParams.get('status')==='expired'?[expired]:[first]}});
  return route.fulfill({json:key==='me'?{ok:true,account:{id:'test-organizer',role:'organizer'}}:{ok:true}});
 });
 await page.goto('/backoffice.html');
 await expect(page.locator('#pending-count')).toHaveText('501');
 await expect(page.locator('#organizer-expired-count')).toHaveText('1');
 await page.locator('[data-overview-filter=expired]').click();
 await expect(page.locator('[data-application-id=expired-after-limit]')).toBeVisible();
 await expect(page.locator('[data-application-id=first]')).toHaveCount(0);
 await page.locator('[data-overview-filter=""]').click();
 await expect(page.locator('[data-application-id=first]')).toBeVisible();
});


test('mobile overview offers compact cards and opens the filtered roster separately',async({page})=>{
 const entries=[{id:'entry-expired',stage_name:'Fictional Entry',approval_state:'pending',video_supplement_state:'expired'}];
 await page.setViewportSize({width:320,height:800});
 await page.route('**/api/e2e/**',route=>{
  const key=new URL(route.request().url()).pathname.split('/').at(-1);
  return route.fulfill({json:key==='me'?{ok:true,account:{id:'fictional-organizer',role:'organizer'}}:
   key==='organizer-queue'?{ok:true,applications:entries,overview:overviewOf(entries)}:{ok:true}});
 });
 await page.goto('/backoffice.html');
 const roster=page.locator('#organizer-roster-panel'),charts=page.locator('#organizer-charts');
 await expect(page.locator('#organizer-roster-open')).toBeVisible();
 await expect(roster).toBeHidden();await expect(charts).toBeHidden();
 await page.locator('#organizer-chart-panel summary').click();
 await expect(charts).toBeVisible();
 await page.locator('#organizer-chart-panel summary').click();
 for(const [lang,label] of [['zh','查看選手名冊'],['en','View contestant roster'],['ne','प्रतियोगी सूची हेर्नुहोस्']]){
  await page.locator('[data-lang='+lang+']').click();
  await expect(page.locator('#organizer-roster-open')).toHaveText(label);
  expect(await page.locator('html').evaluate(el=>el.scrollWidth)).toBeLessThanOrEqual(320);
 }
 const expired=page.locator('[data-overview-filter=expired]');
 await expired.click();
 await expect(roster).toBeVisible();await expect(page.locator('.organizer-overview')).toBeHidden();
 await expect(page.locator('[data-application-id=entry-expired]')).toBeVisible();
 await expect(page.locator('#organizer-roster-heading')).toBeFocused();
 await page.locator('#organizer-summary-back').click();
 await expect(roster).toBeHidden();await expect(expired).toBeFocused();
});

test('public stage details translate, open one at a time and locate the shirt only in the first selection',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/voice.html');
 const stages=page.locator('details[name=ghv-stage]');
 await expect(stages).toHaveCount(5);
 await expect(stages.locator('img')).toHaveCount(1);
 await stages.nth(1).locator('summary').click();
 const shirt=stages.nth(1).locator('img');
 await expect(shirt).toBeVisible();
 await expect(shirt).toHaveAttribute('src','./images/ghp-20261127-shirt.webp');
 await expect.poll(()=>shirt.evaluate(el=>el.naturalWidth)).toBeGreaterThan(0);
 for(const [lang,word] of [['zh','晉級者'],['en','advance from the first selection'],['ne','टी-सर्ट']]){
  await page.locator('[data-lang='+lang+']').first().click();
  await expect(stages.nth(1).locator('.ghv-journey-gift')).toContainText(word);
 }
 await stages.nth(2).locator('summary').click();
 await expect(stages.nth(1)).not.toHaveAttribute('open','');
 await expect(stages.nth(2).locator('p')).toContainText('समूह');
 await expect(shirt).toBeHidden();
 const bilingual=page.locator('#ghv-poster-bilingual');
 const english=page.locator('#ghv-poster-english');
 const card=page.locator('#ghv-business-card');
 for(const [control,file,width] of [
  [bilingual,'poster-bilingual',1055],[english,'poster-en',1024],[card,'business-card',1448]
 ]){
  await control.click();
  const image=control.locator('..').locator('img');
  await expect(image).toBeVisible();
  await expect(image).toHaveAttribute('src','./images/ghp-20261127-'+file+'.webp');
  await expect.poll(()=>image.evaluate(el=>el.naturalWidth)).toBe(width);
 }
 await expect(bilingual.locator('..')).not.toHaveAttribute('open','');
 for(const [lang,copy] of [['zh','查看英文版海報'],['en','View the English poster'],['ne','अङ्ग्रेजी पोस्टर हेर्नुहोस्']]){
  await page.locator('[data-lang='+lang+']').first().click();
  await expect(english).toHaveText(copy);
 }
 for(const width of [320,390,1365]){
  await page.setViewportSize({width,height:844});
  expect(await page.locator('html').evaluate(el=>el.scrollWidth)).toBeLessThanOrEqual(width);
 }
});
