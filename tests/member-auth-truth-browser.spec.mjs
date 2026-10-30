import {test,expect} from '@playwright/test';

test('homepage demo form never creates a member and clearly says not saved to D1',async({page})=>{
 await page.goto('/');
 await page.locator('#sample-fill').click();
 await page.locator('#registration-form button[type="submit"]').click();
 await expect(page.locator('#review-panel')).toBeVisible();
 await page.locator('#sample-submit').click();
 await expect(page.locator('#success-panel')).toBeVisible();
 await expect(page.locator('.demo-no-record')).toContainText('No member account was created.');
 await expect(page.locator('.demo-no-record')).toContainText('does not save a registration');
 await expect(page.locator('.demo-no-record a')).toHaveAttribute('href','./member-login.html');
 const state=await page.evaluate(()=>localStorage.getItem('ghv_member_sandbox_v1'));
 expect(state).toBeNull();
});

test('Chinese homepage sample completion unmistakably marks no real account',async({page})=>{
 await page.goto('/');
 await page.locator('.lang-switch [data-lang="zh"]').click();
 await page.locator('#sample-fill').click();
 await page.locator('#registration-form button[type="submit"]').click();
 await page.locator('#sample-submit').click();
 await expect(page.locator('.demo-no-record')).toContainText('沒有建立真正的會員帳號');
 await expect(page.locator('.demo-no-record')).toContainText('Cloudflare D1');
});

test('multi-round member dashboard opens correct unpaid application at checkout',async({page})=>{
 await page.goto('/member-login.html');
 await page.locator('#register-persona').selectOption('T001');
 await page.locator('#register-test').click();
 await page.goto('/member-portal.html?step=apply');
 await page.locator('#round').selectOption('2027-03');
 await page.locator('#apply').click();
 await page.locator('#order').click();
 await page.locator('#pay-success').click();
 await expect(page.locator('#checkout-card')).toContainText('模擬付款成功');
 await page.locator('#tab-apply').click();
 await page.locator('#round').selectOption('2027-06');
 await page.locator('#apply').click();
 await expect(page.locator('#pay-app')).toHaveValue('APP-TEST-0002');
 await expect(page.locator('#checkout-card')).toContainText('尚未付款');
 await page.goto('/member-login.html');
 await expect(page.locator('#summary-payment')).toContainText('No test order');
 await expect(page.locator('#action-link')).toHaveAttribute('href','./member-portal.html?step=checkout&application=APP-TEST-0002');
 await page.locator('#action-link').click();
 await expect(page.locator('#pay-app')).toHaveValue('APP-TEST-0002');
 await expect(page.locator('#checkout-card')).toContainText('APP-TEST-0002');
 await expect(page.locator('#checkout-card')).toContainText('未建立訂單');
 // Unknown or different-account application selector must never override the session.
 await page.goto('/member-portal.html?step=checkout&application=APP-TEST-9999');
 await expect(page.locator('#pay-app')).toHaveValue('APP-TEST-0001');
});
