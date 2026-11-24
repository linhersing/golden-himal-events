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
