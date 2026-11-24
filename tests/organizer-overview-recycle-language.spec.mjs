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
  :key==='organizer-queue'?{ok:true,applications:entries,registration_management_enabled:true,judging_policy:{mode:'final_only'}}
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
  return route.fulfill({json:key==='me'?{ok:true,account:{id:'test-organizer',role:'organizer',available_roles:['organizer']}}:key==='organizer-queue'?{ok:true,applications:entries}: {ok:true}});
 });
 await page.goto('/backoffice.html');await page.locator('[data-lang=zh]').click();
 await expect(page.locator('#organizer-pending-count')).toHaveText('2');
 await expect(page.locator('#organizer-supplement-count')).toHaveText('2');
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
