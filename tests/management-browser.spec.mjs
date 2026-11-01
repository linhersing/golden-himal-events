import {test,expect} from '@playwright/test';
const overview={ok:true,scope:'ALL_ACTIVE_SYNTHETIC_WORKSPACES',testOnly:true,official:false,
 as_of:'2026-11-01T05:45:00Z',financialStatus:'NOT_CONNECTED_NO_REAL_PAYMENTS',
 actual_payments:{status:'NOT_CONNECTED',paid_count:null,received_npr:null},
 sources:{
 practice:{status:'available',counts:{active_workspaces:2,applications:3,distinct_test_identities:2,
 january:2,april:1,university:2,community:1,bagmati:3,gandaki:0,
 demo:3,qualifier:0,final:0,mock_unpaid:2,mock_paid:1,scorecards:4,votes:0,nonredeemable_vouchers:0}},
 e2e:{status:'not_configured',counts:null}
 }};
const rows={ok:true,scope:'ALL_ACTIVE_SYNTHETIC_WORKSPACES',source:'practice',
 status:'available',page:1,page_size:50,total:3,as_of:'2026-11-01T05:45:00Z',items:[
 {record_id:'GHV-TEST-000001',scope:'practice',round_code:'2027-01',category:'university',
 province:'bagmati',phase:'demo',review_status:'demo',payment_status:'deferred',
 scorecards:2,score_mean:82,votes:0,real_payment:false,created_at:1790000000},
 {record_id:'GHV-TEST-000002',scope:'practice',round_code:'2027-04',category:'community',
 province:'bagmati',phase:'demo',review_status:'demo',payment_status:'simulation_only',
 scorecards:2,score_mean:76,votes:0,real_payment:false,created_at:1790000000},
 {record_id:'GHV-TEST-000003',scope:'practice',round_code:'2027-01',category:'university',
 province:'bagmati',phase:'demo',review_status:'demo',payment_status:'deferred',
 scorecards:0,score_mean:null,votes:0,real_payment:false,created_at:1790000000}
 ]};
test('global sponsor dashboard hides numbers on unauthorized Access response',async({page})=>{
 await page.route('**/api/staging/management/**',route=>route.fulfill({
  status:503,contentType:'application/json',body:JSON.stringify({ok:false,error:'admin_access_not_configured'})}));
 await page.goto('/admin-center.html');
 await expect(page.locator('#status')).toContainText('管理員後台程式已部署');
 await expect(page.locator('#content')).toBeHidden();
 await expect(page.locator('#cards')).toBeEmpty();
});
test('mobile and desktop organizer view shows total/score/payment categories without PII and prints summary',async({page})=>{
 await page.route('**/api/staging/management/**',route=>{
  const url=route.request().url(),result=url.includes('/overview')?overview:url.includes('source=e2e')?
   {...rows,source:'e2e',status:'not_configured',total:null,items:[]}:rows;
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(result)});
 });
 for(const width of [320,360,375,390,428,1280]){
  await page.setViewportSize({width,height:850});
  await page.goto('/admin-center.html');
  await expect(page.locator('#cards .stat')).toHaveCount(8);
  await expect(page.locator('#cards')).toContainText('虛構測試報名筆數');
  await expect(page.locator('#cards')).toContainText('3');
  await expect(page.locator('#rows tr')).toHaveCount(3);
  await expect(page.locator('#rows')).toContainText('模擬付款完成');
  await expect(page.locator('.boundary')).toContainText('正式報名分開');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  if(width===390){
   await page.locator('#cards').screenshot({path:'test-results/ghv-admin-kpis-mobile.png'});
   await page.locator('#records').screenshot({path:'test-results/ghv-admin-records-mobile.png'});
   await page.locator('[data-tab="payments"]').click();
   await expect(page.locator('#records-title')).toContainText('付款狀態');
   await page.locator('#source').selectOption('e2e');
   await expect(page.locator('#rows')).toContainText('此資料來源未啟用');
   await page.locator('#source').selectOption('practice');
  }
  if(width===1280){
   await page.locator('#cards').screenshot({path:'test-results/ghv-admin-kpis-desktop.png'});
   await page.emulateMedia({media:'print'});
   await expect(page.locator('.table-wrap')).toBeHidden();
   await expect(page.locator('#cards')).toBeVisible();
   await page.emulateMedia({media:'screen'});
  }
 }
});
