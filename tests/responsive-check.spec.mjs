import { expect, test } from '@playwright/test';

for(const viewport of [{width:390,height:844},{width:768,height:1024},{width:1440,height:900}]){
 test('no page-level horizontal overflow at '+viewport.width,async({page})=>{
   await page.setViewportSize(viewport);
   await page.goto('/');
   await expect(page.locator('h1')).toBeVisible();
   const widths=await page.evaluate(()=>({viewport:document.documentElement.clientWidth,content:document.documentElement.scrollWidth}));
   expect(widths.content).toBeLessThanOrEqual(widths.viewport);
 });
}

test('filter announcements',async({page})=>{
  await page.goto('/');
  await page.locator('[data-filter="shortlist"]').click();
  await expect(page.locator('.news-card:not([hidden])')).toHaveCount(1);
  await page.locator('[data-filter="all"]').click();
  await expect(page.locator('.news-card:not([hidden])')).toHaveCount(3);
});

test('sample registration never sends a form request',async({page})=>{
  await page.goto('/');
  const writes=[];
  page.on('request',request=>{if(!['GET','HEAD'].includes(request.method())) writes.push(request.url())});
  await page.locator('#sample-fill').click();
  await page.locator('#registration-form button[type="submit"]').click();
  await expect(page.locator('#review-panel')).toBeVisible();
  await page.locator('#sample-submit').click();
  await expect(page.locator('#success-panel')).toBeVisible();
  expect(writes).toEqual([]);
});

test('demo vote and reset work without real persistence',async({page})=>{
  await page.goto('/');
  await page.locator('[data-vote="02"]').click();
  await page.locator('#voter-demo-code').fill('000000');
  await page.locator('#confirm-vote').click();
  await expect(page.locator('#voter-demo-error')).toBeVisible();
  await expect(page.locator('#vote-count-02')).toHaveText('0');
  await page.locator('#voter-demo-code').fill('246810');
  await page.locator('#confirm-vote').click();
  await expect(page.locator('#vote-count-02')).toHaveText('1');
  await expect(page.locator('[data-vote="01"]')).toBeDisabled();
  await page.locator('#reset-votes').click();
  await expect(page.locator('#vote-count-02')).toHaveText('0');
});

test('Nepali and Chinese can be selected',async({page})=>{
  await page.goto('/');
  await page.locator('[data-lang="ne"]').click();
  await expect(page.locator('html')).toHaveAttribute('lang','ne');
  await page.locator('[data-lang="zh"]').click();
  await expect(page.locator('html')).toHaveAttribute('lang','zh-Hant');
});

test('separate D1 staging test never transmits typed form data',async({page})=>{
  await page.goto('/');
  const captured=[];
  await page.route('**/api/staging/health',route=>route.fulfill({
    status:200,contentType:'application/json',
    body:JSON.stringify({ok:true,testOnly:true,tableReady:true,canWrite:true})
  }));
  await page.route('**/api/staging/registration-test',route=>{
    captured.push(JSON.parse(route.request().postData()));
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
      ok:true,testOnly:true,stored:{id:2,display_name:'TEST-SINGER-API-001',status:'pending'}
    })});
  });
  await page.locator('#sample-fill').click();
  await page.locator('#registration-form button[type="submit"]').click();
  await page.locator('#sample-submit').click();
  await page.locator('#d1-health-check').click();
  await expect(page.locator('#d1-send-test')).toBeEnabled();
  await page.locator('#d1-send-test').click();
  await expect(page.locator('#d1-staging-status')).toContainText('TEST-SINGER-API-001');
  expect(captured).toEqual([{sample:'TEST-SINGER-API-001'}]);
});
