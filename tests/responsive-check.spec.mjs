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

test('announcements have an honest empty state and a working rules entry',async({page})=>{
  await page.goto('/announcements.html');
  await page.locator('[data-lang=zh]').click();
  await expect(page.locator('.announcement-empty')).toContainText('尚未公布入選名單');
  await expect(page.locator('[data-filter="shortlist"], .news-card')).toHaveCount(0);
  await page.locator('.announcement-rules-link').click();
  await expect(page).toHaveURL(/\/news\.html$/);
  await expect(page.locator('#rules-eligibility')).toBeAttached();
});

test('homepage uses the real member entry and never simulates a saved registration',async({page})=>{
  const writes=[];
  page.on('request',request=>{if(!['GET','HEAD'].includes(request.method())) writes.push(request.url())});
  await page.goto('/');
  await expect(page.locator('#sample-fill,#sample-submit,#success-panel,#registration-form')).toHaveCount(0);
  await page.locator('#home-competition').click();
  await expect(page).toHaveURL(/\/voice\.html$/);
  await expect(page.locator('a[href*="member"]')).not.toHaveCount(0);
  expect(writes).toEqual([]);
});

test('public visitor pages expose no operational vote or reset controls',async({page})=>{
  const writes=[];page.on('request',r=>{if(!['GET','HEAD'].includes(r.method()))writes.push(r.url())});
  for(const path of ['/','/voice.html','/news.html']){
   await page.goto(path);
   await expect(page.locator('[data-vote],#confirm-vote,#reset-votes,#voter-demo-code')).toHaveCount(0);
  }
  expect(writes).toEqual([]);
});

test('Nepali and Chinese can be selected',async({page})=>{
  await page.goto('/');
  await page.locator('[data-lang="ne"]').click();
  await expect(page.locator('html')).toHaveAttribute('lang','ne');
  await page.locator('[data-lang="zh"]').click();
  await expect(page.locator('html')).toHaveAttribute('lang','zh-Hant');
});

test('the public journey has no D1 test controls or staging writes',async({page})=>{
  const writes=[];page.on('request',r=>{if(!['GET','HEAD'].includes(r.method())&&r.url().includes('/api/staging/'))writes.push(r.url())});
  for(const path of ['/','/voice.html','/announcements.html','/news.html']){
   await page.goto(path);
   await expect(page.locator('#d1-health-check,#d1-send-test,#d1-staging-status')).toHaveCount(0);
   await expect(page.locator('a[href*="test-lab"],a[href*="e2e-stage"]')).toHaveCount(0);
  }
  expect(writes).toEqual([]);
});
