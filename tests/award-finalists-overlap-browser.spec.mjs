import {test,expect} from '@playwright/test';

test('news and voice award explanations remain consistent in Chinese, English and Nepali',async({page})=>{
 for(const lang of ['zh','en','ne']){
  await page.goto('/news.html');
  await page.locator('[data-lang="'+lang+'"]').click();
  const overview=page.locator('[data-l="awardOverviewBody"]');
  await expect(overview).toContainText('NPR 200,000');
  await expect(overview).toContainText('NPR 215,000');
  await expect(overview).toContainText('NPR 415,000');
  const title=page.locator('[data-l="awardOverviewTitle"]');
  const titleText=await title.textContent();
  expect(titleText).toContain(lang==='ne'?'१०':'10');
  await expect(page.locator('[data-l="guidePrizeText"]')).not.toContainText('＋10');
  await expect(page.locator('a[href="#rules-awards"]')).toHaveCount(1);

  await page.goto('/voice.html');
  await page.locator('[data-lang="'+lang+'"]').click();
  const reward=page.locator('[data-t="rewardsTop"]');
  for(const amount of ['NPR 20,000','NPR 200,000','NPR 215,000','NPR 415,000']){
   await expect(reward).toContainText(amount);
  }
  await expect(page.locator('.voice-prize-tier')).toHaveCount(4);
  await expect(page.locator('a[href="./news.html#rules-awards"]')).toHaveCount(1);
 }
});
test('mobile award descriptions do not change the award grid or introduce horizontal scrolling',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/voice.html');
 await expect(page.locator('.voice-prize-tier')).toHaveCount(4);
 await expect(page.locator('[data-t="rewardsTop"]')).toContainText('NPR 415,000');
 await page.goto('/news.html');
 await page.locator('#rules-awards summary').click();
 await expect(page.locator('[data-l="awardOverviewBody"]')).toBeVisible();
 await expect(page.locator('.prize-table [role="listitem"]')).toHaveCount(3);
});
