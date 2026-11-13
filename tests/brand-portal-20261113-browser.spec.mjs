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
  await expect(page.locator('.portal-top-nav a')).toHaveCount(4);
  await expect(page.locator('.portal-photo-card')).toHaveCount(3);
  if(width<=650){
   const [prev,next]=[page.locator('#portal-gallery-prev'),page.locator('#portal-gallery-next')];
   await expect(prev).toBeVisible();
   await expect(next).toBeVisible();
   await expect(prev).toBeDisabled();
   await expect(page.locator('#portal-gallery-count')).toHaveText('1 / 3');
   for(const b of [prev,next]){
    const rect=await b.boundingBox();
    expect(rect?.height).toBeGreaterThanOrEqual(44);
    expect(rect?.width).toBeGreaterThanOrEqual(44);
   }
   await next.click();
   await expect(page.locator('#portal-gallery-count')).toHaveText('2 / 3');
   await expect(prev).toBeEnabled();
   await prev.click();
   await expect(page.locator('#portal-gallery-count')).toHaveText('1 / 3');
  }else{
   await expect(page.locator('.portal-gallery-controls')).toBeHidden();
  }
  const menuLinks=page.locator('.portal-top-nav a');
  await expect(menuLinks).toHaveCount(4);
  if(width<=650){
   for(const link of await menuLinks.all()){
    const box=await link.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
   }
  }
  await expect(page.locator('#home-about')).toHaveAttribute('href','./golden-himal.html');
  await expect(page.locator('.portal-photo-card img[src*="gh-real-fountain-20261113.webp"]')).toHaveCount(0);
  await expect(page.locator('.portal-photo-card img[src*="gh-real-fountain-night-landscape"]')).toHaveCount(1);
  for(const pic of await page.locator('.portal-photo-card img').all()){
   await pic.scrollIntoViewIfNeeded();
   await expect.poll(()=>pic.evaluate(el=>el.complete&&el.naturalWidth>0),{timeout:10000}).toBeTruthy();
  }
  const geometry=await page.locator('.portal-choices').evaluate(el=>({
   columns:getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length,
   tiles:[...el.children].map(node=>({x:node.getBoundingClientRect().left,y:node.getBoundingClientRect().top}))
  }));
  expect(geometry.columns).toBe(width<=650?1:3);
  expect(width<=650 ? geometry.tiles[1].y>geometry.tiles[0].y : geometry.tiles[1].y===geometry.tiles[0].y).toBeTruthy();
 }
});

test('brand story balances venue photos with authentic narrative and quiet image details, with working back links',async({page})=>{
 for(const width of [320,390,1280]){
  await page.setViewportSize({width,height:850});
  await page.goto('/golden-himal.html');
  await expect(page.locator('h1')).toContainText('金色晨光');
  await expect(page.locator('.name-piece')).toHaveCount(3);
  await expect(page.locator('.portal-top-nav a')).toHaveCount(4);
  await expect(page.locator('.portal-top-nav [aria-current=page]')).toHaveAttribute('href','./golden-himal.html');
  await expect(page.locator('.story-gallery .gallery-card')).toHaveCount(4);
  await expect(page.locator('.gallery-disclaimer')).toContainText('現場實拍');
  await expect(page.locator('[data-p="journeyHeading"]')).toBeVisible();
  await expect(page.locator('.story-gallery figcaption [data-p="galleryEnhanced"]')).toHaveCount(0);
  await expect(page.locator('.story-more')).not.toHaveAttribute('open','');
  await page.locator('.story-more summary').click();
  await expect(page.locator('.story-gallery-more .gallery-card')).toHaveCount(2);
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
 await expect(page.locator('#portal-gallery-next')).toHaveAttribute('aria-label','Next photo');
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
