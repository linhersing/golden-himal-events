import {test,expect} from '@playwright/test';

test('persistent staging participant UI is separate from legacy localStorage mock',async({page})=>{
 await page.goto('/e2e-stage.html');
 await expect(page.locator('body')).toHaveAttribute('data-role','member');
 await expect(page.locator('#send-form')).toBeVisible();
 await expect(page.locator('#workspace')).toBeHidden();
 await expect(page.locator('.safety')).toContainText('STAGING');
 await expect(page.locator('[data-i18n="pageIntro"]')).toContainText('D1');
 await expect(page.locator('#email')).toHaveAttribute('type','email');
 await expect(page.locator('#application-form')).toHaveCount(1);
 await expect(page.locator('#queue')).toHaveCount(0);
 await page.locator('[data-lang="zh"]').click();
 await expect(page.locator('html')).toHaveAttribute('lang','zh-Hant');
 await expect(page.locator('#signin-heading')).toHaveText('Email 驗證與會員登入');
});
test('judge UI has its own login and a role-gated empty scoring surface',async({page})=>{
 await page.goto('/judge-stage.html');
 await expect(page.locator('body')).toHaveAttribute('data-role','reviewer');
 await expect(page.locator('#send-form')).toBeVisible();
 await expect(page.locator('#workspace')).toBeHidden();
 await expect(page.locator('#review-title')).toBeHidden();
 await expect(page.locator('#application-form')).toHaveCount(0);
 await page.locator('[data-lang="ne"]').click();
 await expect(page.locator('#signin-heading')).toContainText('इमेल');
});
test('staging member and judge login remain mobile usable',async({page})=>{
 await page.setViewportSize({width:375,height:800});
 for(const path of ['/e2e-stage.html','/judge-stage.html','/organizer-stage.html']){
  await page.goto(path);
  const r=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
  expect(r.scroll).toBeLessThanOrEqual(r.client);
  await expect(page.locator('#email')).toBeVisible();
  await expect(page.locator('[data-lang="en"]')).toBeVisible();
 }
});


test('Alan V2 preview shows Jan/Apr windows and invitation-only organizer surface',async({page})=>{
 await page.goto('/');
 await page.locator('.site-header [data-lang="zh"]').click();
 await expect(page.locator('.season-grid')).toContainText('2027年1月1日至31日');
 await expect(page.locator('.season-grid')).toContainText('2027年4月1日至30日');
 await expect(page.locator('.season-grid')).toContainText('2027年9月初');
 await expect(page.locator('.v2-rule-summary')).toContainText('NPR 332,000');
 await expect(page.locator('a[href="./organizer-stage.html"]')).toBeVisible();
 await page.goto('/e2e-stage.html');
 await expect(page.locator('#round option')).toHaveCount(2);
 await expect(page.locator('#round option').first()).toHaveAttribute('value','2027-01');
 await expect(page.locator('#round option').last()).toHaveAttribute('value','2027-04');
 await expect(page.locator('#province option')).toHaveCount(2);
 await page.goto('/organizer-stage.html');
 await expect(page.locator('body')).toHaveAttribute('data-role','organizer');
 await expect(page.locator('#admin-apps')).toBeHidden();
 await expect(page.locator('#send-form')).toBeVisible();
});
