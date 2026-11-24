import assert from 'node:assert/strict';
import {join} from 'node:path';
import {fixtures} from './staff-workerd.mjs';

export async function checkRecycle(runtime,browser,evidence,expect){
 const endpoint='/api/e2e/organizer-registration-bulk',db=runtime.db;
 const counts=async()=>Promise.all(['e2e_applications','e2e_demo_2027_videos','e2e_demo_2027_scores','e2e_judge_scores'].map(async table=>(await db.prepare('SELECT COUNT(*) n FROM '+table).first()).n));
 const before=await counts();
 for(const role of ['guest','member','reviewer'])
  assert.equal((await runtime.fetchFor(role,endpoint,{operation:'preview'})).status,role==='guest'?401:403);
 const widths=[280,320,360,375,390,412,430,480,768,1440],results=[];
 const overflow=async page=>assert((await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth))<=1);
 for(const [device,width] of [['desktop',1440],['mobile',390]]){
  const context=await runtime.injectContext(browser,'organizer',{viewport:{width,height:900},locale:'zh-TW',...(device==='mobile'?{isMobile:true,hasTouch:true}:{})});
  try{
   const page=await context.newPage();await page.goto(runtime.origin+'/backoffice.html');
   await page.locator('#staff-management-open').click();
   const frame=page.locator('#organizer-entry-dialog');
   await expect(frame).toContainText('選手名單管理');
   await expect(frame.locator('#admin-registration-list .admin-select-row').first()).toBeVisible();
   if(device==='desktop'){
    // The existing one-at-a-time recoverability must survive the new bulk UI.
    await frame.getByRole('button',{name:new RegExp(fixtures[3].stageName)}).click();
    page.on('dialog',dialog=>dialog.accept());
    await frame.getByRole('button',{name:'移至回收區',exact:true}).click();
    await expect(frame).toContainText('資源回收桶 · 可還原');
    assert.equal((await db.prepare('SELECT state FROM e2e_registration_controls WHERE application_id=?').bind(fixtures[3].id).first()).state,'deleted');
    await frame.getByRole('button',{name:'復原報名',exact:true}).click();
    await expect(frame.getByRole('button',{name:'移至回收區',exact:true})).toBeVisible();
    await frame.locator('#organizer-entry-back').click();
   }
   const checked=frame.locator('#admin-registration-list input[data-admin-select-id]:not([disabled])');
   await expect(checked.nth(1)).toBeVisible();
   const allowed=await checked.count();assert(allowed>=2,'need two selectable fixtures');
   // All means THIS PAGE, never all 500 test records or all matching pages.
   await frame.locator('#admin-select-page').check();
   await expect(frame.locator('#admin-selected-count')).toHaveText('已選 '+allowed+' 筆');
   await frame.locator('#admin-select-page').uncheck();
   await expect(frame.locator('#admin-selected-count')).toHaveText('已選 0 筆');
   const ids=await checked.evaluateAll(items=>items.slice(0,2).map(el=>el.dataset.adminSelectId));
   for(const id of ids)await frame.locator('#admin-registration-list input[data-admin-select-id="'+id+'"]').check();
   await expect(frame.locator('#admin-selected-count')).toHaveText('已選 2 筆');
   const preview=page.waitForResponse(r=>r.url().endsWith(endpoint)&&r.request().postDataJSON()?.operation==='preview');
   await frame.locator('#admin-selected-action').click();
   const plan=await (await preview).json();
   assert.equal(plan.action,'delete');assert.equal(plan.total,2);
   assert.equal(plan.protected_count,0);
   const bulk=frame.locator('.staff-bulk-workspace');
   await expect(bulk).toContainText('這不是永久刪除');
   await expect(bulk.locator('[name=confirmation]')).toBeEnabled();
   for(const w of widths){await page.setViewportSize({width:w,height:900});await overflow(page);}
   await page.setViewportSize({width,height:900});
   await page.screenshot({path:join(evidence,'recycle-selected-'+device+'.png')});
   await bulk.locator('[name=confirmation]').fill('移到回收桶');
   await bulk.getByRole('button',{name:'確認移到資源回收桶'}).click();
   await expect(bulk).toContainText('已由資料庫確認這批結果。');
   for(const id of ids)
    assert.equal((await db.prepare('SELECT state FROM e2e_registration_controls WHERE application_id=?').bind(id).first()).state,'deleted');
   assert.deepEqual(await counts(),before,'moving to recycle bin preserves all physical records');
   await page.screenshot({path:join(evidence,'recycle-selected-complete-'+device+'.png')});
   await frame.locator('#organizer-entry-close').click();
   await expect(frame).toBeHidden();
   await page.locator('#staff-trash-open').click();
   await expect(frame.locator('#admin-registration-search select[name=state]')).toHaveValue('deleted');
   // Only restore the same checked IDs, even if unrelated recycle-bin
   // records also exist from earlier TEST sessions.
   for(const id of ids){
    const checkbox=frame.locator('#admin-registration-list input[data-admin-select-id="'+id+'"]');
    await expect(checkbox).toBeVisible();await checkbox.check();
   }
   await expect(frame.locator('#admin-selected-count')).toHaveText('已選 2 筆');
   const restorePreview=page.waitForResponse(r=>r.url().endsWith(endpoint)&&r.request().postDataJSON()?.operation==='preview'&&r.request().postDataJSON()?.action==='restore');
   await frame.locator('#admin-selected-action').click();
   const restore=await (await restorePreview).json();
   assert.equal(restore.action,'restore');assert.equal(restore.total,2);
   await bulk.locator('[name=confirmation]').fill('確認還原');
   await bulk.getByRole('button',{name:'確認還原到名單'}).click();
   await expect(bulk).toContainText('已由資料庫確認這批結果。');
   for(const id of ids)
    assert.equal((await db.prepare('SELECT state FROM e2e_admin_registrations WHERE id=?').bind(id).first()).state,'active');
   assert.deepEqual(await counts(),before,'restore preserves all original contestant data');
   await page.screenshot({path:join(evidence,'recycle-selected-restored-'+device+'.png')});
   await frame.locator('#organizer-entry-close').click();
   await expect(frame).toBeHidden();
   await expect(page.locator('#admin-apps')).toBeVisible();
   results.push({device,selected:2,protectedKept:true,recordsPreserved:true,viewports:widths,recycleAndRestore:true});
  }finally{await context.close()}
 }
 return {result:'PASS',recordsPreserved:before,cases:results};
}
