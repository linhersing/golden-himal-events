import {test,expect} from '@playwright/test';

// Visual usability only. Mocked API responses are not proof of actual Cloudflare
// email delivery, D1 writes, or R2 objects. Those require cloud acceptance logs.
test('phone-first signup shows email input in the first view and a three-step journey',async({page})=>{
 for(const width of [320,360,375,390,428]){
  await page.setViewportSize({width,height:800});
  await page.goto('/e2e-stage.html');
  const input=page.locator('#email');
  await expect(input).toBeVisible();
  await expect(page.locator('.access-step[data-step="email"]')).toHaveAttribute('aria-current','step');
  await expect(page.locator('#send-form button[type="submit"]')).toBeVisible();
  const metric=await page.evaluate(()=>({
   doc:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth,
   inputHeight:document.querySelector('#email').getBoundingClientRect().height,
   buttonHeight:document.querySelector('#send-form button[type="submit"]').getBoundingClientRect().height,
   buttonFont:parseFloat(getComputedStyle(document.querySelector('#send-form button')).fontSize),
   inputFont:parseFloat(getComputedStyle(document.querySelector('#email')).fontSize)
  }));
  expect(metric.doc).toBeLessThanOrEqual(metric.viewport);
  expect(metric.inputHeight).toBeGreaterThanOrEqual(52);
  expect(metric.buttonHeight).toBeGreaterThanOrEqual(52);
  expect(metric.inputFont).toBeGreaterThanOrEqual(16);
  expect(metric.buttonFont).toBeGreaterThanOrEqual(16);
  await expect(page.locator('[data-lang="ne"]')).toBeVisible();
  await expect(page.locator('[data-lang="zh"]')).toBeVisible();
 }
});
test('email→code→account access-step states are accurate and change-email works',async({page})=>{
 let logged=false;
 await page.route('**/api/e2e/**',async route=>{
  const req=route.request(),u=new URL(req.url());
  const path=u.pathname;
  const data=path.endsWith('/me')?logged?{ok:true,account:{id:'test-member-uuid',role:'member'}}:{ok:false,error:'login_required'}:
    path.endsWith('/request-code')?{ok:true,challenge_id:'test-challenge-id'}:
    path.endsWith('/verify-code')?(logged=true,{ok:true}):
    path.endsWith('/applications')?{ok:true,applications:[]}:
    path.endsWith('/finalists')?{ok:true,finalists:[]}:{ok:false,error:'not_found'};
  await route.fulfill({status:data.ok?200:401,contentType:'application/json',body:JSON.stringify(data)});
 });
 await page.goto('/e2e-stage.html');
 await page.locator('#email').fill('tester@example.invalid');
 await page.locator('#send-form button').click();
 await expect(page.locator('#send-form')).toBeHidden();
 await expect(page.locator('#verify-form')).toBeVisible();
 await expect(page.locator('.access-step[data-step="verify"]')).toHaveAttribute('aria-current','step');
 await page.locator('#change-email').click();
 await expect(page.locator('#send-form')).toBeVisible();
 await expect(page.locator('.access-step[data-step="email"]')).toHaveAttribute('aria-current','step');
 await page.locator('#send-form button').click();
 await page.locator('#code').fill('123456');
 await page.locator('#verify-form button[type="submit"]').click();
 await expect(page.locator('#workspace')).toBeVisible();
 await expect(page.locator('.access-step[data-step="account"]')).toHaveAttribute('aria-current','step');
});
test('Nepali and Chinese keep clear sign-in instructions on small phone',async({page})=>{
 await page.setViewportSize({width:360,height:780});
 await page.goto('/e2e-stage.html');
 await page.locator('[data-lang="ne"]').click();
 await expect(page.locator('html')).toHaveAttribute('lang','ne');
 await expect(page.locator('[data-i18n="stepVerify"]')).toContainText('प्रमाणित');
 await page.locator('[data-lang="zh"]').click();
 await expect(page.locator('#signin-heading')).toContainText('Email');
 await expect(page.locator('[data-i18n="emailHint"]')).toContainText('驗證碼');
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
 expect(overflow).toBeLessThanOrEqual(0);
});
test('mobile homepage points to clean member flow without exposed engineer test links',async({page})=>{
 await page.setViewportSize({width:375,height:812});
 await page.goto('/');
 await expect(page.locator('.front-actions .choice')).toHaveCount(3);
 await expect(page.locator('.choice-main')).toHaveAttribute('href','./member.html#register');
 await expect(page.locator('.front-actions a').nth(1)).toHaveAttribute('href','./member.html#login');
 await expect(page.locator('.front-actions a').nth(2)).toHaveAttribute('href','./news.html');
 await expect(page.locator('.backoffice-link')).toHaveAttribute('href','./backoffice.html');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
});
test('desktop print brief exists and is A4 portrait printable with V2 dates',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 await page.goto('/print-brief.html');
 await expect(page.locator('h1')).toContainText('歌唱嘉年華');
 await expect(page.locator('.grid .step')).toHaveCount(5);
 await expect(page.locator('.points')).toContainText('NPR 500');
 await page.emulateMedia({media:'print'});
 const vals=await page.evaluate(()=>({
  print:getComputedStyle(document.querySelector('.toolbar')).display,
  width:getComputedStyle(document.querySelector('.page')).width
 }));
 expect(vals.print).toBe('none');
 expect(parseFloat(vals.width)).toBeGreaterThan(750);
});
