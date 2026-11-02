import {test,expect} from '@playwright/test';
test('desktop homepage highlights the three real visitor actions',async({page})=>{
 await page.setViewportSize({width:1366,height:768});
 await page.goto('/');
 const choices=page.locator('.front-actions a');
 await expect(choices).toHaveCount(3);
 await expect(choices.nth(0)).toContainText('我要報名');
 await expect(choices.nth(1)).toContainText('會員登入');
 await expect(choices.nth(2)).toContainText('最新公告');
 await expect(choices.nth(0)).toHaveAttribute('href','./member.html#register');
 await expect(choices.nth(1)).toHaveAttribute('href','./member.html#login');
 await expect(page.locator('.backoffice-link')).toHaveAttribute('href','./backoffice.html');
 // Legacy browser-only fictional account remains testable at its direct URL.
 await page.goto('/member-login.html');
 await expect(page.locator('#auth-view h2')).toContainText('Member');
});
test('English Nepali Chinese translations remain available without adding page clutter',async({page})=>{
 await page.goto('/');
 await page.locator('[data-lang=ne]').click();
 await expect(page.locator('.choice-main')).toContainText('प्रतियोगितामा सहभागी');
 await expect(page.locator('html')).toHaveAttribute('lang','ne');
 await page.locator('[data-lang=en]').click();
 await expect(page.locator('.choice-main')).toContainText('Join the competition');
 await page.reload();
 await expect(page.locator('html')).toHaveAttribute('lang','en');
 await page.locator('[data-lang=zh]').click();
 await expect(page.locator('.choice-main')).toContainText('我要報名');
});
test('mobile visitor can reach a separate registration page without overflow',async({page})=>{
 for(const width of [320,375,390]){
  await page.setViewportSize({width,height:812});
  await page.goto('/');
  await expect(page.locator('.locale [data-lang=en]')).toBeVisible();
  const dims=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
  expect(dims.scroll).toBeLessThanOrEqual(dims.client);
  await page.locator('.choice-main').click();
  await expect(page).toHaveURL(/member\.html#register$/);
  await expect(page.locator('#member-email-form')).toBeVisible();
  const m=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(m).toBeLessThanOrEqual(0);
 }
});
