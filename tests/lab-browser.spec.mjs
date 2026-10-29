import {test,expect} from '@playwright/test';

// Real headless Chrome checks: the laboratory itself is isolated and local-only.
test('sandbox front/back registration → review → announcement → vote → reset',async({page},testInfo)=>{
 await page.setViewportSize({width:1440,height:900});
 await page.route('**/api/staging/health',route=>route.fulfill({
  status:200,contentType:'application/json',
  body:JSON.stringify({ok:true,testOnly:true,tableReady:true,canWrite:false})
 }));
 await page.route('**/api/staging/dashboard',route=>route.fulfill({
  status:200,contentType:'application/json',
  body:JSON.stringify({ok:true,testOnly:true,source:'cloudflare-d1',canWrite:false,
   stats:{registered:2,university:2,community:0}})
 }));
 const writes=[];
 page.on('request',r=>{if(r.method()!=='GET'&&r.method()!=='HEAD')writes.push({method:r.method(),url:r.url()})});
 await page.goto('/test-lab.html');
 await expect(page.locator('.warning')).toContainText('TEST ONLY');
 await page.screenshot({path:testInfo.outputPath('ghv-sandbox-desktop-front.png'),fullPage:true});
 await page.locator('#candidate').selectOption('T001');
 await page.locator('#lab-form button[type="submit"]').click();
 await expect(page.locator('#form-status')).toContainText('GHV-TEST-0001');
 await page.locator('#tab-admin').click();
 await expect(page.locator('#registration-rows tr')).toHaveCount(1);
 await page.locator('#registration-rows button').first().click();
 await expect(page.locator('#registration-rows')).toContainText('已通過');
 await page.screenshot({path:testInfo.outputPath('ghv-sandbox-desktop-admin.png'),fullPage:true});
 await page.locator('#tab-news').click();
 await page.locator('#publish').click();
 await expect(page.locator('#notice-state')).toContainText('已發佈');
 await page.locator('#tab-votes').click();
 await page.locator('#vote').click();
 await expect(page.locator('#vote-status')).toContainText('本機');
 await page.locator('#vote').click();
 await expect(page.locator('#vote-status')).toContainText('重複投票');
 await page.reload();
 await page.locator('#tab-reports').click();
 await expect(page.locator('#local-count')).toHaveText('1');
 await expect(page.locator('#d1-count')).toHaveText('2');
 page.once('dialog',d=>d.accept());
 await page.locator('#reset').click();
 await expect(page.locator('#local-count')).toHaveText('0');
 await expect(page.locator('#d1-count')).toHaveText('2');
 expect(writes).toEqual([]);
});

test('mobile sandbox shows usable tabs without horizontal page overflow',async({page},testInfo)=>{
 await page.setViewportSize({width:390,height:844});
 await page.route('**/api/staging/**',route=>route.fulfill({status:503,contentType:'application/json',body:'{"ok":false}'}));
 await page.goto('/test-lab.html');
 await expect(page.locator('h1')).toBeVisible();
 await page.locator('#tab-admin').click();
 await expect(page.locator('#panel-admin')).toBeVisible();
 await page.screenshot({path:testInfo.outputPath('ghv-sandbox-mobile-admin.png'),fullPage:true});
 const w=await page.evaluate(()=>({inner:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
 expect(w.scroll).toBeLessThanOrEqual(w.inner);
 await expect(page.locator('#cloud-state')).toContainText('未能核對');
});
