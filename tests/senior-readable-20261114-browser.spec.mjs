import {test,expect} from '@playwright/test';

// Senior-friendly means readable without relying on tiny explanatory copy,
// usable tap targets, and no page-wide horizontal scrolling on small devices.
// Do not duplicate or modify registration, payment, authentication or site links.
test('age-inclusive public pages remain readable and reachable from 320px to desktop',async({page})=>{
 for(const width of [320,375,390,768,1280]){
  await page.setViewportSize({width,height:850});
  for(const route of ['/', '/voice.html', '/news.html', '/member.html']){
   await page.goto(route);
   const dims=await page.evaluate(()=>({
    client:document.documentElement.clientWidth,
    scroll:document.documentElement.scrollWidth
   }));
   expect(dims.scroll,route+' horizontal overflow at '+width).toBeLessThanOrEqual(dims.client);
   const buttons=page.locator('.locale button');
   await expect(buttons).toHaveCount(3);
   for(const button of await buttons.all()){
    const rect=await button.boundingBox();
    expect(rect?.height,route+' language switch height').toBeGreaterThanOrEqual(44);
    expect(rect?.width,route+' language switch width').toBeGreaterThanOrEqual(44);
   }
  }
  await page.goto('/voice.html');
  const sub=page.locator('#home-apply small');
  const font=await sub.evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
  expect(font,'Voice signup explanation at '+width).toBeGreaterThanOrEqual(15);
  await expect(page.locator('#home-apply')).toHaveAttribute('href','./member.html#register');
  await expect(page.locator('#home-login')).toHaveAttribute('href','./member.html#login');
  const photo=page.locator('.front-visual-wedding-image img');
  await expect(photo).toBeVisible();
  expect(await photo.evaluate(el=>el.complete&&el.naturalWidth===1080&&el.naturalHeight===625)).toBe(true);
  const noticeFont=await page.locator('.voice-prize-note').evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
  expect(noticeFont,'important contest notice').toBeGreaterThanOrEqual(15);
  await page.goto('/');
  const portalFont=await page.locator('.portal-choice-copy small').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
  expect(portalFont,'Palace tile explanation at '+width).toBeGreaterThanOrEqual(15);
  await page.goto('/news.html');
  const newsFont=await page.locator('.news-row[open] .news-detail p').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
  expect(newsFont,'expanded contest rules at '+width).toBeGreaterThanOrEqual(16);
 }
});
