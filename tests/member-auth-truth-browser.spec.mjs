import {test,expect} from '@playwright/test';
test('public homepage has no fake registration form or fake success message',async({page})=>{
 await page.goto('/');
 await expect(page.locator('.front-actions .choice')).toHaveCount(3);
 await expect(page.locator('#registration-form')).toHaveCount(0);
 await expect(page.locator('.under-actions')).toContainText('尚未開放');
 const state=await page.evaluate(()=>localStorage.getItem('ghv_member_sandbox_v1'));
 expect(state).toBeNull();
});
test('member Email integration fails closed when not configured',async({page})=>{
 await page.route('**/api/e2e/**',async r=>r.fulfill({status:503,json:{ok:false,error:'e2e_not_configured'}}));
 await page.goto('/member.html#register');
 await page.locator('#member-email-form [name=email]').fill('fictional@example.invalid');
 await page.locator('#member-email-form button').click();
 await expect(page.locator('#member-status')).toContainText('尚未開通 Email');
 await expect(page.locator('#member-panel')).toBeHidden();
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
 await expect(page.locator('#checkout-card')).toContainText('未建立訂單');
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
