import {test,expect} from '@playwright/test';

test('brand-first homepage has exactly three visible primary destinations and footer-only location',async({page})=>{
 for(const width of [320,375,390,768,1280]){
  await page.setViewportSize({width,height:850});
  await page.goto('/');
  await expect(page.locator('.portal-choices .portal-choice')).toHaveCount(3);
  await expect(page.locator('#home-about')).toHaveAttribute('href','./golden-himal.html');
  await expect(page.locator('#home-competition')).toHaveAttribute('href','./voice.html');
  await expect(page.locator('#home-news')).toHaveAttribute('href','./news.html');
  await expect(page.locator('.portal-choice').first()).toContainText('認識 Golden Himal');
  await expect(page.locator('.portal-choice').nth(1)).toContainText('Golden Himal Voice');
  await expect(page.locator('.portal-choice').last()).toContainText('最新公告');
  await expect(page.locator('#home-apply')).toHaveCount(0);
  await expect(page.locator('#location')).toContainText('尼泊爾奇旺');
  await expect(page.locator('.portal-map')).toHaveAttribute('href',/27\.666389%2C84\.228333/);
  await expect(page.locator('.portal-footer .test-site-footer')).toContainText('TEST MODE');
  await expect(page.locator('footer .staff-stealth-link')).toHaveCount(1);
  const dims=await page.evaluate(()=>({viewport:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
  expect(dims.scroll).toBeLessThanOrEqual(dims.viewport);
  const image=page.locator('.portal-scene img');
  await expect(image).toBeVisible();
  expect(await image.evaluate(el=>el.complete&&el.naturalWidth>0)).toBeTruthy();
 }
});

test('brand story balances venue photos with authentic narrative and quiet image details, with working back links',async({page})=>{
 for(const width of [320,390,1280]){
  await page.setViewportSize({width,height:850});
  await page.goto('/golden-himal.html');
  await expect(page.locator('h1')).toContainText('金色晨光');
  await expect(page.locator('.name-piece')).toHaveCount(3);
  await expect(page.locator('.story-gallery .gallery-card')).toHaveCount(4);
  await expect(page.locator('.gallery-disclaimer')).toContainText('數位重製');
  await expect(page.locator('[data-p="journeyHeading"]')).toBeVisible();
  await expect(page.locator('.story-gallery figcaption [data-p="galleryEnhanced"]')).toHaveCount(0);
  await expect(page.locator('.story-more')).not.toHaveAttribute('open','');
  await page.locator('.story-more summary').click();
  await expect(page.locator('.story-gallery-more .gallery-card')).toHaveCount(3);
  await expect(page.locator('#location')).toContainText('尼泊爾奇旺');
  for(const im of await page.locator('.story-gallery img').all()){
   await im.scrollIntoViewIfNeeded();
   await expect.poll(()=>im.evaluate(el=>el.complete&&el.naturalWidth>0),{timeout:10000}).toBeTruthy();
  }
  const dims=await page.evaluate(()=>({viewport:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
  expect(dims.scroll).toBeLessThanOrEqual(dims.viewport);
 }
 await page.locator('.story-next').click();
 await expect(page).toHaveURL(/voice\.html$/);
 await expect(page.locator('#home-apply')).toBeVisible();
 await expect(page.locator('#home-login')).toBeVisible();
 await expect(page.locator('.front-actions .choice')).toHaveCount(3);
});

test('brand, Voice and latest news share EN / Nepali / Chinese language preference',async({page})=>{
 await page.goto('/');
 await page.locator('[data-lang=en]').click();
 await expect(page.locator('#home-about')).toContainText('Discover Golden Himal');
 await page.locator('#home-about').click();
 await expect(page.locator('html')).toHaveAttribute('lang','en');
 await expect(page.locator('h1')).toContainText('golden Himalayan light');
 await page.locator('[data-lang=ne]').click();
 await expect(page.locator('html')).toHaveAttribute('lang','ne');
 await expect(page.locator('.name-piece').first()).toContainText('सुनौला');
 await page.goto('/voice.html');
 await expect(page.locator('html')).toHaveAttribute('lang','ne');
 await page.goto('/news.html');
 await expect(page.locator('html')).toHaveAttribute('lang','ne');
 await page.goto('/');
 await page.locator('[data-lang=zh]').click();
 await expect(page.locator('#home-news')).toContainText('最新公告');
 await page.locator('#home-news').click();
 await expect(page.locator('h1')).toContainText('最新消息');
});
