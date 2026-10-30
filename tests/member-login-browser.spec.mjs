import {test,expect} from '@playwright/test';

test('fictional member creates account, returns to login and sees individual entry/payment',async({page},testInfo)=>{
 const writes=[];
 page.on('request',req=>{if(!['GET','HEAD'].includes(req.method()))writes.push(req.url())});
 await page.goto('/member-login.html');
 await expect(page.locator('#login-form')).toBeVisible();
 await expect(page.locator('.test-banner')).toContainText('TEST ONLY');
 await page.locator('#register-persona').selectOption('T001');
 await page.locator('#register-test').click();
 await expect(page.locator('#dashboard-view')).toBeVisible();
 await expect(page.locator('#summary-member')).toHaveText('MEM-TEST-0001');
 await expect(page.locator('#summary-status')).toContainText('No entry yet');
 await page.goto('/member-portal.html?step=apply');
 await expect(page.locator('#active-apply')).toContainText('MEM-TEST-0001');
 await page.locator('#apply').click();
 await page.locator('#order').click();
 await page.locator('#pay-success').click();
 await page.goto('/member-login.html');
 await expect(page.locator('#dashboard-view')).toBeVisible();
 await expect(page.locator('#summary-status')).toContainText('Under review');
 await expect(page.locator('#summary-payment')).toContainText('Mock paid NPR 500');
 await expect(page.locator('#entries-list')).toContainText('APP-TEST-0001');
 await expect(page.locator('#entries-list')).toContainText('TEST-DEMO-60S');
 await page.screenshot({path:testInfo.outputPath('personal-dashboard-desktop.png'),fullPage:true});
 await page.locator('#sign-out').click();
 await expect(page.locator('#login-form')).toBeVisible();
 await page.locator('#login-username').fill('TEST-SINGER-001');
 await page.locator('#login-password').fill('WRONG');
 await page.locator('#login-form button[type="submit"]').click();
 await expect(page.locator('#login-feedback')).toContainText('incorrect');
 await page.locator('#login-password').fill('GHV-TEST-2027');
 await page.locator('#login-form button[type="submit"]').click();
 await expect(page.locator('#summary-member')).toHaveText('MEM-TEST-0001');
 await expect(page.locator('#entries-list')).toContainText('APP-TEST-0001');
 expect(writes).toEqual([]);
});

test('underage synthetic registration refused and language switch',async({page})=>{
 await page.goto('/member-login.html');
 await page.locator('#register-persona').selectOption('T020');
 await page.locator('#register-test').click();
 await expect(page.locator('#register-feedback')).toContainText('under 18');
 await expect(page.locator('#dashboard-view')).toBeHidden();
 await page.locator('[data-lang="ne"]').click();
 await expect(page.locator('#auth-title')).toContainText('तपाईंको');
 await expect(page.locator('html')).toHaveAttribute('lang','ne');
 await page.locator('#register-persona').selectOption('T002');
 await page.locator('#register-test').click();
 await expect(page.locator('#dashboard-view')).toBeVisible();
 await expect(page.locator('#summary-category')).toContainText('सामाजिक');
});

test('mobile personal account layout is readable without overflow',async({page},testInfo)=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/member-login.html');
 await page.locator('#register-persona').selectOption('T003');
 await page.locator('#register-test').click();
 await expect(page.locator('#dashboard-view')).toBeVisible();
 const dim=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
 expect(dim.scroll).toBeLessThanOrEqual(dim.client);
 await page.screenshot({path:testInfo.outputPath('personal-dashboard-mobile.png'),fullPage:true});
});
