import {test,expect} from '@playwright/test';

const expected=['NPR 20,000','NPR 200,000','NPR 50,000','NPR 30,000','NPR 15,000','NPR 215,000','NPR 415,000'];
for(const [lang,button] of [['zh','中文'],['en','EN'],['ne','नेपाली']]){
 test('news awards: '+lang+' shows one ten-person finalist pool and all cash amounts',async({page})=>{
  await page.goto('/news.html#rules-awards');
  await page.locator('[data-lang="'+lang+'"]').click();
  const prize=page.locator('#rules-awards');
  await expect(prize).toBeVisible();
  if(!(await prize.evaluate(el=>el.open)))await prize.locator('summary').click();
  const body=prize.locator('[data-l="awardOverviewBody"]');
  await expect(body).toBeVisible();
  for(const amount of expected)await expect(body).toContainText(amount);
  await expect(prize.locator('[data-l="awardOverviewTitle"]')).not.toContainText('9名名次得獎者；另10名');
  await expect(page.locator('a[href="#rules-awards"]')).toHaveCount(1);
  await expect(prize.locator('.prize-table [role="listitem"]')).toHaveCount(3);
 });
 test('voice teaser: '+lang+' preserves same-ten distinction and rule link',async({page})=>{
  await page.goto('/voice.html');
  await page.locator('[data-lang="'+lang+'"]').click();
  const body=page.locator('[data-t="rewardsTop"]');
  for(const amount of expected)await expect(body).toContainText(amount);
  await expect(page.locator('.voice-prize-tier')).toHaveCount(4);
  await expect(page.locator('.voice-prize-link')).toHaveAttribute('href','./news.html#rules-awards');
 });
}
