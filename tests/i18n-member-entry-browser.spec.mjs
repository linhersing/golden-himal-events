import {test,expect} from '@playwright/test';

test('desktop Chinese choice makes login obvious and remains Chinese on personal account',async({page})=>{
 await page.setViewportSize({width:1366,height:768});
 await page.goto('/');
 const member=page.locator('.header-actions .member-gateway');
 await expect(member).toBeVisible();
 await expect(member).toContainText('Member Login / My Account');
 await expect(page.locator('.preview-ribbon a')).toHaveCount(0);
 await expect(page.locator('.footer-test-links a')).toHaveCount(2);
 await page.locator('.site-header [data-lang="zh"]').click();
 await expect(page.locator('html')).toHaveAttribute('lang','zh-Hant');
 await expect(member).toContainText('會員登入／我的專區');
 await expect(page.locator('.member-entrance')).toContainText('前往我的會員中心');
 await expect(page.locator('.preview-ribbon')).toContainText('請勿填寫真實個人資料');
 await member.click();
 await expect(page).toHaveURL(/member-login\.html$/);
 await expect(page.locator('html')).toHaveAttribute('lang','zh-Hant');
 await expect(page.locator('#auth-view h2')).toContainText('會員登入');
 await expect(page.locator('[data-i18n="usernameLabel"]')).toContainText('虛構測試 Email');
 await expect(page.locator('#login-form button[type="submit"]')).toContainText('登入我的會員中心');
 await page.locator('#register-persona').selectOption('T001');
 await page.locator('#register-test').click();
 await expect(page.locator('#dashboard-view')).toBeVisible();
 await expect(page.locator('#dashboard-title')).toHaveText('我的參賽進度');
 await expect(page.locator('#summary-status')).toHaveText('尚未報名');
 await page.reload();
 await expect(page.locator('html')).toHaveAttribute('lang','zh-Hant');
 await expect(page.locator('#dashboard-title')).toHaveText('我的參賽進度');
});

test('English and Nepali switches stay in sync between homepage and login',async({page})=>{
 await page.goto('/');
 await page.locator('[data-lang="ne"]').click();
 await expect(page.locator('.member-gateway')).toContainText('सदस्य लगइन');
 await page.locator('.member-gateway').click();
 await expect(page.locator('html')).toHaveAttribute('lang','ne');
 await expect(page.locator('#auth-view h2')).toContainText('सदस्य साइन इन');
 await page.locator('[data-lang="en"]').click();
 await expect(page.locator('#auth-view h2')).toHaveText('Member sign in');
 await page.locator('.header-link').click();
 await expect(page.locator('html')).toHaveAttribute('lang','en');
 await expect(page.locator('.member-gateway')).toContainText('Member Login / My Account');
});

test('small mobile screen keeps member access and three language controls readable',async({page})=>{
 await page.setViewportSize({width:375,height:812});
 await page.goto('/');
 await page.locator('[data-lang="zh"]').click();
 await expect(page.locator('.member-gateway')).toBeVisible();
 await expect(page.locator('.lang-switch [data-lang="en"]')).toBeVisible();
 await expect(page.locator('.lang-switch [data-lang="ne"]')).toBeVisible();
 await expect(page.locator('.lang-switch [data-lang="zh"]')).toBeVisible();
 let dims=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
 expect(dims.scroll).toBeLessThanOrEqual(dims.client);
 await page.locator('.member-gateway').click();
 await expect(page.locator('#auth-view h2')).toHaveText('會員登入');
 dims=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
 expect(dims.scroll).toBeLessThanOrEqual(dims.client);
});
