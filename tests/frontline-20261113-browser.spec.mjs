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


test('frontline awards and quick rules are clear, actionable and mobile-readable in three languages',async({page})=>{
 for(const width of [320,375,390,1280]){
  await page.setViewportSize({width,height:820});
  await page.goto('/news.html#rules-awards');
  await page.locator('[data-lang=zh]').click();
  const award=page.locator('#rules-awards');
  await expect(award).toHaveAttribute('open','');
  await expect(page.locator('.news-quick-grid a')).toHaveCount(5);
  await expect(award.locator('.award-overview')).toContainText('每組9人，共18人');
  await expect(award.locator('.award-overview')).toContainText('每位');
  const rows=award.locator('.prize-table [role=listitem]');
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0)).toContainText('NPR 45,000');
  await expect(rows.nth(1)).toContainText('NPR 22,000');
  await expect(rows.nth(2)).toContainText('NPR 11,000');
  for(let i=0;i<3;i++)await expect(rows.nth(i)).toContainText('每位');
  await expect(award.locator('.voucher-heading')).toContainText('不是現金獎金');
  await expect(award.locator('.voucher-notice')).toContainText('NPR 10,000');
  await expect(award.locator('.award-faq-list>div')).toHaveCount(3);
  await expect(award.locator('.award-faq-list')).toContainText('NPR 500');
  await expect(award.locator('.news-fineprint')).toContainText('尚未開放');
  await expect(page.locator('.news-quick-grid a[href="#rules-awards"]')).toHaveCount(1);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await award.locator('.award-followups a[href="#rules-selection"]').click();
  await expect(page.locator('#rules-selection')).toHaveAttribute('open','');
  await page.locator('.news-quick-grid a[href="#rules-eligibility"]').click();
  await expect(page.locator('#rules-eligibility')).toHaveAttribute('open','');
 }
 await page.goto('/news.html#rules-awards');
 await page.locator('[data-lang=en]').click();
 await expect(page.locator('.news-quick-guide h2')).toHaveText('Contestant quick guide');
 await expect(page.locator('#rules-awards .award-overview')).toContainText('18 total');
 await expect(page.locator('#rules-awards .voucher-heading')).toContainText('not cash');
 await page.locator('[data-lang=ne]').click();
 await expect(page.locator('.news-quick-guide h2')).toContainText('प्रतियोगीका लागि');
 await expect(page.locator('#rules-awards .award-faq-list')).toContainText('NPR ५००');
 await expect(page.locator('.news-quick-grid a[href="#rules-registration"]')).toHaveAttribute('href','#rules-registration');
});


test('public contestant pages never expose internal frontline or draft-version terminology',async({page})=>{
 for(const [path,label] of [['/news.html','news'],['/member.html','member'],['/voice.html','voice']]){
  await page.goto(path);
  for(const lang of ['en','zh','ne']){
   await page.locator('[data-lang="'+lang+'"]').click();
   const text=await page.locator('body').innerText();
   expect(text,{message:label+'/'+lang+' must use contestant-facing language'}).not.toMatch(/前線|\bV2\b|frontline|November 13|11月13日|內部資料/i);
  }
 }
 await page.goto('/news.html#rules-awards');
 await page.locator('[data-lang=zh]').click();
 await expect(page.locator('.news-quick-guide')).toContainText('先看五個參賽重點');
 await expect(page.locator('.news-board-head')).toContainText('正式報名與收費尚未開放');
 await expect(page.locator('#rules-awards')).toHaveAttribute('open','');
});
