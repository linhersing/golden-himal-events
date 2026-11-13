import {test,expect} from '@playwright/test';

test('frontline organizers and purpose appear in the second-layer Voice home',async({page})=>{
 for(const width of [320,375,390,1280]){
  await page.setViewportSize({width,height:850});
  await page.goto('/voice.html');
  await expect(page.locator('.event-credits')).toContainText('Golden Himal Palace');
  await expect(page.locator('.event-credits')).toContainText('Synergy FM');
  await expect(page.locator('.event-credits')).toContainText('Kalika FM');
  await expect(page.locator('.mission-intro')).toContainText('帶動尼泊爾音樂發展');
  await expect(page.locator('.front-actions .choice')).toHaveCount(3);
  const footer=page.locator('footer .test-site-footer');
  await expect(footer).toContainText('TEST MODE');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  await expect(page.locator('.masthead + .event-credits')).toBeVisible();
 }
});

test('frontline schedule stays readable with English, Nepali and Chinese; April link is not offered',async({page})=>{
 await page.setViewportSize({width:375,height:812});
 await page.goto('/news.html');
 await expect(page.locator('.news-row').first()).toHaveAttribute('open','');
 await expect(page.locator('.news-schedule li')).toHaveCount(5);
 await expect(page.locator('.news-schedule')).toContainText('2027年1月1日至1月31日');
 await expect(page.locator('.news-schedule')).toContainText('2027年4月1日至4月30日');
 await expect(page.locator('.test-site-footer')).toBeVisible();
 await expect(page.locator('.news-board a[href*="2027-04"]')).toHaveCount(0);
 await page.locator('[data-lang=en]').click();
 await expect(page.locator('.news-schedule')).toContainText('January 1–31, 2027');
 await page.locator('[data-lang=ne]').click();
 await expect(page.locator('.news-schedule')).toContainText('जनवरी');
 await page.locator('[data-lang=zh]').click();
 await expect(page.locator('.news-schedule')).toContainText('海選一');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});

test('qualification requirements are informational and cannot leak identity documents through public URLs',async({page})=>{
 await page.route('**/api/e2e/**',route=>route.fulfill({status:503,json:{ok:false,error:'e2e_not_configured'}}));
 await page.goto('/member.html#register');
 await expect(page.locator('.test-site-footer')).toContainText('TEST MODE');
 await expect(page.locator('.evidence-plan')).toBeAttached();
 await page.locator('.evidence-plan summary').click();
 await expect(page.locator('.evidence-plan')).toContainText('有效學生證');
 await expect(page.locator('.evidence-plan')).toContainText('安全');
 await expect(page.locator('.evidence-plan input[type=file]')).toHaveCount(0);
 await expect(page.locator('#application-form input[name=demo_url]')).toHaveAttribute('type','url');
});
