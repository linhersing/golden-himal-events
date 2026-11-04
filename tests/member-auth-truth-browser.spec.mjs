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

/* UX screenshot evidence only. All API responses below are synthetic:
 * images verify layout and controls, NOT actual Gmail or live D1 state. */
test('Nepal singer onboarding CTA and category guidance work on mobile (synthetic UI screenshot)',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.route('**/api/e2e/**',async r=>{
  const endpoint=new URL(r.request().url()).pathname;
  const payload=endpoint.endsWith('/me')?{ok:true,account:{id:'synthetic-member',role:'member'}}:
   endpoint.endsWith('/applications')?{ok:true,applications:[]}:{ok:false,error:'not_found'};
  await r.fulfill({status:payload.ok?200:404,contentType:'application/json',body:JSON.stringify(payload)});
 });
 await page.goto('/member.html#login');
 await expect(page.locator('#member-panel')).toBeVisible();
 await expect(page.locator('#start-application')).toBeVisible();
 await expect(page.locator('#application-details')).not.toHaveAttribute('open','');
 const before=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
 expect(before).toBeLessThanOrEqual(0);
 await page.locator('#start-application').scrollIntoViewIfNeeded();
 await page.screenshot({path:'test-results/ghv-singer-ux-20261104/01-mobile-start-button.png'});
 await page.locator('#start-application').click();
 await expect(page.locator('#application-details')).toHaveAttribute('open','');
 await expect(page.locator('#start-application')).toHaveAttribute('aria-expanded','true');
 await expect(page.locator('#university-statement')).toBeVisible();
 await expect(page.locator('#community-statement')).toBeHidden();
 await page.locator('#category').selectOption('community');
 await expect(page.locator('#community-statement')).toBeVisible();
 await expect(page.locator('#university-statement')).toBeHidden();
 await expect(page.locator('#application-form [name=adult_confirmed]')).toHaveAttribute('required','');
 await expect(page.locator('#application-form [name=song_language]')).toHaveValue('');
 await page.locator('#song-language').selectOption('Nepali');
 await page.locator('#song-key').selectOption('Unknown');
 await expect(page.locator('#song-language')).toHaveValue('Nepali');
 await expect(page.locator('#song-key')).toHaveValue('Unknown');
 await page.locator('#category').scrollIntoViewIfNeeded();
 await page.screenshot({path:'test-results/ghv-singer-ux-20261104/02-mobile-category-and-guidance.png'});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
});
test('TEST payment state is displayed after explicit confirmation, never claimed as real payment (synthetic UI screenshot)',async({page})=>{
 let paid=false;
 await page.setViewportSize({width:1280,height:820});
 await page.route('**/api/e2e/**',async r=>{
  const u=new URL(r.request().url()),p=u.pathname;
  let payload;
  if(p.endsWith('/me'))payload={ok:true,account:{id:'synthetic-member',role:'member'}};
  else if(p.endsWith('/applications'))payload={ok:true,applications:[{id:'TEST-ENTRY-0001',stage_name:'TEST Singer',song_title:'Example Song',category:'university',round_code:'2027-01',status:paid?'under_review':'submitted',payment_status:paid?'simulated_paid':'unpaid',demo_url:'https://youtu.be/abcdef'}]};
  else if(p.endsWith('/mock-payment')){paid=true;payload={ok:true,status:'simulated_paid',testOnly:true,realCharge:false,amount_npr:500};}
  else payload={ok:false,error:'not_found'};
  await r.fulfill({status:payload.ok?200:404,contentType:'application/json',body:JSON.stringify(payload)});
 });
 page.on('dialog',d=>d.accept());
 await page.goto('/member.html#login');
 await expect(page.getByText('Complete TEST checkout (no charge)')).toBeVisible();
 await page.getByText('Complete TEST checkout (no charge)').click();
 await expect(page.locator('#test-completion')).toBeVisible();
 await expect(page.locator('#test-completion')).toContainText('TEST REGISTRATION COMPLETE');
 await expect(page.locator('#test-completion')).toContainText('No payment charged');
 await expect(page.getByText('✓ TEST checkout complete')).toBeVisible();
 await page.locator('#test-completion').scrollIntoViewIfNeeded();
 await page.screenshot({path:'test-results/ghv-singer-ux-20261104/03-desktop-mock-payment-receipt.png'});
});
test('latest news remains short expandable cards (synthetic UI screenshot)',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/news.html');
 await expect(page.locator('.announcement-accordion')).toHaveCount(4);
 await page.locator('.announcement-accordion').first().locator('summary').click();
 await expect(page.locator('.announcement-accordion').first()).toHaveAttribute('open','');
 await expect(page.getByText(/January 1–31/)).toBeVisible();
 await page.screenshot({path:'test-results/ghv-singer-ux-20261104/04-mobile-news-accordion.png'});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
});
