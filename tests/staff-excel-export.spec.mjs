import {expect,test} from '@playwright/test';
import {buildStaffWorkbook} from '../backend/staff-xlsx.js';

const xlsxMime='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
for(const role of ['organizer','reviewer']){
 test(role+' downloads an Excel workbook from the staff workspace',async({page})=>{
  const bytes=buildStaffWorkbook({role,entries:[],exportedAt:1});
  await page.route('**/api/e2e/**',async route=>{
   const endpoint=new URL(route.request().url()).pathname.split('/').at(-1);
   if(endpoint==='me')return route.fulfill({json:{ok:true,account:{role,available_roles:[role]},judging_policy:{mode:'all_stages_test'}}});
   if(endpoint===role+'-export'){
    expect(route.request().method()).toBe('POST');
    expect(new URL(route.request().url()).searchParams.get('lang')).toBe('en');
    return route.fulfill({contentType:xlsxMime,body:Buffer.from(bytes)});
   }
   return route.fulfill({json:{ok:true,applications:[],queue:[]}});
  });
  await page.setViewportSize({width:390,height:820});
  await page.goto('/backoffice.html');
  await page.locator('[data-lang=en]').click();
  const button=page.locator('[data-staff-excel="'+role+'"]');
  await expect(button).toHaveText(role==='organizer'?'Export contestant Excel (includes personal data)':'Export judging roster to Excel');
  await expect(page.locator('[data-staff-excel]').filter({visible:true})).toHaveCount(1);
  const downloadPromise=page.waitForEvent('download');
  await button.click();
  const download=await downloadPromise;
  expect(download.suggestedFilename()).toBe('Golden-Himal-Voice-'+role+'.xlsx');
  expect(await download.failure()).toBeNull();
  await expect(page.locator('#back-status')).toHaveText('Excel download started.');
  if(role==='organizer'){
   await page.route('**/api/e2e/organizer-export?*',route=>route.fulfill({status:413,json:{ok:false}}));
   await button.click();
   await expect(page.locator('#back-status')).toHaveText('The roster exceeds 2,000 entries. No data was exported.');
  }
 });
}
