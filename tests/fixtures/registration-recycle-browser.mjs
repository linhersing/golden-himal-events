import assert from 'node:assert/strict';
import {join} from 'node:path';
import {fixtures} from './staff-workerd.mjs';

export async function checkRecycle(runtime,browser,evidence,expect){
 const endpoint='/api/e2e/organizer-registration-bulk',db=runtime.db;
 const counts=async()=>Promise.all(['e2e_applications','e2e_demo_2027_videos','e2e_demo_2027_scores','e2e_judge_scores'].map(async table=>(await db.prepare('SELECT COUNT(*) n FROM '+table).first()).n));
 const before=await counts();
 for(const role of ['guest','member','reviewer'])assert.equal((await runtime.fetchFor(role,endpoint,{operation:'preview'})).status,role==='guest'?401:403);
 const sizes=[280,320,360,375,390,412,430,480,768,1440],results=[];
 const overflow=async page=>assert((await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth))<=1);
 for(const [device,width] of [['desktop',1440],['mobile',390]]){
  const context=await runtime.injectContext(browser,'organizer',{viewport:{width,height:900},locale:'zh-TW',...(device==='mobile'?{isMobile:true,hasTouch:true}:{})});
  try{
   const page=await context.newPage();await page.goto(runtime.origin+'/backoffice.html');
   await page.locator('#staff-management-open').click();
   const frame=page.locator('#organizer-entry-dialog');
   if(device==='desktop'){
    await frame.getByRole('button',{name:new RegExp(fixtures[3].stageName)}).click();
    page.on('dialog',dialog=>dialog.accept());
    await frame.getByRole('button',{name:'移至回收區',exact:true}).click();
    await expect(frame).toContainText('已刪除，可復原');
    assert.equal((await db.prepare('SELECT state FROM e2e_registration_controls WHERE application_id=?').bind(fixtures[3].id).first()).state,'deleted');
    await frame.getByRole('button',{name:'復原報名',exact:true}).click();
    await expect(frame.getByRole('button',{name:'移至回收區',exact:true})).toBeVisible();
    await frame.locator('#organizer-entry-back').click();
   }
   await frame.locator('#admin-registration-bulk-open').click();
   const bulk=frame.locator('.staff-bulk-workspace');await expect(bulk).toBeVisible();
   const previewResponse=page.waitForResponse(r=>r.url().endsWith(endpoint)&&r.request().postDataJSON()?.operation==='preview');
   await bulk.getByRole('button',{name:'預覽全部可回收報名',exact:true}).click();
   const plan=await (await previewResponse).json();assert(plan.total>=10);assert(plan.protected_count>=2);
   await expect(bulk.locator('[name=confirmation]')).toBeEnabled();
   assert.equal((await db.prepare("SELECT COUNT(*) n FROM e2e_registration_controls WHERE state='deleted'").first()).n,0,'preview does not mutate');
   for(const w of sizes){await page.setViewportSize({width:w,height:900});await overflow(page);}
   await page.setViewportSize({width,height:900});
   await page.screenshot({path:join(evidence,'recycle-preview-'+device+'.png')});
   let intercepted=0;
   if(device==='mobile')await page.route('**'+endpoint,async route=>{
    if(route.request().postDataJSON()?.operation!=='apply'||intercepted){await route.continue();return;}
    intercepted++;
    const response=await route.fetch();assert.equal(response.status(),200);
    await route.abort('timedout'); // Commit succeeded, response lost: UI must not guess.
   });
   await bulk.locator('[name=confirmation]').fill('DELETE TEST');
   await bulk.getByRole('button',{name:'確認處理這一批',exact:true}).click();
   if(device==='mobile'){
    await expect(bulk).toContainText('結果尚未確認');assert.equal(intercepted,1);
    await expect(bulk.locator('[name=confirmation]')).toHaveCount(0);
    assert.equal((await db.prepare("SELECT COUNT(*) n FROM e2e_registration_controls WHERE state='deleted'").first()).n,10);
    await page.screenshot({path:join(evidence,'recycle-unknown-mobile.png')});
    await page.reload();
    await page.locator('#staff-management-open').click();await frame.locator('#admin-registration-bulk-open').click();
    await bulk.getByRole('button',{name:'重新讀取最近批次',exact:true}).click();
    await bulk.getByRole('button',{name:new RegExp(plan.batch_id)}).click();
    await expect(bulk.getByRole('button',{name:'繼續尚未處理項目',exact:true})).toBeEnabled();
    await bulk.locator('[name=confirmation]').fill('DELETE TEST');
    await bulk.getByRole('button',{name:'繼續尚未處理項目',exact:true}).click();
   }
   await expect(bulk.getByRole('button',{name:'預覽復原這一批',exact:true})).toBeEnabled();
   await expect(bulk.locator('[name=confirmation]')).toHaveCount(0);
   assert.equal((await db.prepare("SELECT COUNT(*) n FROM e2e_registration_controls WHERE state='deleted'").first()).n,plan.total);
   assert.deepEqual(await counts(),before,'recycling preserves physical records');
   await page.screenshot({path:join(evidence,'recycle-complete-'+device+'.png')});
   await frame.locator('#organizer-entry-back').click();
   await expect(frame.locator('#admin-registration-list button')).toHaveCount(plan.protected_count);
   await frame.locator('#admin-registration-bulk-open').click();
   await bulk.getByRole('button',{name:'預覽復原這一批',exact:true}).click();
   await expect(bulk.locator('[name=confirmation]')).toBeEnabled();
   await bulk.locator('[name=confirmation]').fill('RESTORE TEST');
   await bulk.getByRole('button',{name:'確認處理這一批',exact:true}).click();
   await expect(bulk.locator('[name=confirmation]')).toHaveCount(0);
   await expect(bulk.getByRole('button',{name:'查核這批結果',exact:true})).toBeEnabled();
   assert.equal((await db.prepare("SELECT COUNT(*) n FROM e2e_registration_controls WHERE state='deleted'").first()).n,0);
   assert.deepEqual(await counts(),before);
   await page.screenshot({path:join(evidence,'recycle-restored-'+device+'.png')});
   for(const [lang,label] of [['en','Recycle TEST registrations in bulk'],['ne','परीक्षण दर्ता समूहमा हटाउनुहोस्']]){
    await frame.locator('#organizer-entry-close').click();await expect(frame).toBeHidden();
    await page.locator('.staff-languages [data-lang='+lang+']').click();
    await page.locator('#staff-management-open').click();await frame.locator('#admin-registration-bulk-open').click();
    await expect(frame).toContainText(label);
   }
   await page.evaluate(()=>document.documentElement.style.fontSize='200%');await overflow(page);
   await frame.locator('#organizer-entry-close').click();await expect(frame).toBeHidden();
   await expect(page.locator('#admin-apps')).toBeVisible();
   results.push({device,eligible:plan.total,protected:plan.protected_count,deletedRestored:true,viewports:sizes,readback:true,backRefreshesRoster:true,...(device==='mobile'?{postCommitTimeout:'reloaded, checked persisted batch, then explicitly resumed'}:{singleRecycleAndRestore:true})});
  }finally{await context.close();}
 }
 return {result:'PASS',recordsPreserved:before,cases:results};
}
