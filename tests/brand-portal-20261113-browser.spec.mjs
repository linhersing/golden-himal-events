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

test('2027 rule highlights, clear senior navigation and public visual evidence (no personal data)',async({page},testInfo)=>{
 for(const [width,height,label] of [[1280,900,'desktop'],[390,844,'mobile']]){
  await page.setViewportSize({width,height});
  await page.goto('/');
  await page.locator('[data-lang=zh]').click();
  await expect(page.locator('.portal-top-nav a')).toHaveCount(4);
  await expect(page.locator('.portal-choices a')).toHaveCount(3);
  await page.screenshot({path:testInfo.outputPath('golden-himal-home-'+label+'.png'),fullPage:true,animations:'disabled'});
  await page.goto('/voice.html');
  await page.locator('[data-lang=zh]').click();
  const figure=page.locator('.front-visual-wedding-image');
  const approvedImage=figure.locator('img');
  await expect(figure).toBeVisible();
  await expect(figure).toHaveAttribute('data-design-revision','approved-image-20261114');
  await expect(approvedImage).toHaveAttribute('src','./images/voice-wedding-hero-approved-20261114.jpg');
  await expect(approvedImage).toHaveAttribute('alt',/The Best Wedding at Golden Himal/);
  await expect.poll(()=>approvedImage.evaluate(el=>el.complete&&el.naturalWidth===1080&&el.naturalHeight===625),{timeout:15000}).toBeTruthy();
  await expect(page.locator('.wedding-halo, .wedding-slogan, .wedding-nepali')).toHaveCount(0);
  const appearance=await figure.evaluate(el=>{
    const art=el.querySelector('img');
    const rect=art.getBoundingClientRect();
    return {
      border:getComputedStyle(el).borderTopWidth,
      shadow:getComputedStyle(el).boxShadow,
      overflow:document.documentElement.scrollWidth>window.innerWidth,
      aspect:rect.width/rect.height,
      naturalAspect:art.naturalWidth/art.naturalHeight
    };
  });
  expect(appearance.border).toBe('0px');
  expect(appearance.shadow).toBe('none');
  expect(appearance.overflow).toBeFalsy();
  expect(Math.abs(appearance.aspect-appearance.naturalAspect)).toBeLessThan(.015);
  await expect(page.locator('.voice-prize-voucher')).toContainText('NPR 10,000');
  await expect(page.locator('.voice-prize-top')).toContainText('NPR 45,000');
  await expect(page.locator('#home-apply')).toHaveAttribute('href','./member.html#register');
  await page.screenshot({path:testInfo.outputPath('golden-himal-voice-'+label+'.png'),fullPage:true,animations:'disabled'});
  await page.goto('/news.html#rules-awards');
  await page.locator('[data-lang=zh]').click();
  await expect(page.locator('#rules-awards')).toContainText('NPR 10,000');
  await expect(page.locator('#rules-awards')).toContainText('NPR 22,000');
  await expect(page.locator('#rules-voting')).toContainText('Muse',{timeout:10000}).catch(()=>{});
  await page.screenshot({path:testInfo.outputPath('golden-himal-news-'+label+'.png'),fullPage:true,animations:'disabled'});
  await page.goto('/member.html#register');
  await page.locator('[data-lang=zh]').click();
  await expect(page.locator('[name=nonreligious_song_ack]')).toBeAttached();
  await expect(page.locator('[name=no_exclusive_contract]')).toBeAttached();
  await page.screenshot({path:testInfo.outputPath('golden-himal-member-'+label+'.png'),fullPage:true,animations:'disabled'});
  await page.goto('/golden-himal.html');
  await page.locator('[data-lang=zh]').click();
  await page.screenshot({path:testInfo.outputPath('golden-himal-about-'+label+'.png'),fullPage:true,animations:'disabled'});
 }
});

test('approved supplemental concept gallery and elegant clickable navigation at mobile and desktop',async({page})=>{
 for(const width of [320,390,768,1280]){
  await page.setViewportSize({width,height:860});
  await page.goto('/');
  await page.locator('[data-lang=zh]').click();
  const imgs=page.locator('.portal-concept-card img');
  await expect(imgs).toHaveCount(3);
  await expect(page.locator('#design-views-heading')).toContainText('建築設計意象');
  await expect(page.locator('.portal-concepts-disclaimer')).toContainText('並非現場實拍');
  for(const [i,filename] of [
   [0,'approved-fountain-night-20261114.jpg'],
   [1,'approved-peace-tower-20261114.jpg'],
   [2,'approved-grand-hall-20261114.jpg']
  ]){
   const img=imgs.nth(i);
   await expect(img).toHaveAttribute('src','./images/'+filename);
   await img.scrollIntoViewIfNeeded();
   await expect.poll(()=>img.evaluate(el=>el.complete&&el.naturalWidth===1024&&el.naturalHeight===768),{timeout:15000}).toBe(true);
  }
  await expect(page.locator('.portal-concept-card')).toHaveCount(3);
  await expect(page.locator('.portal-concept-card figcaption small')).toHaveCount(0);
  // Only the gallery-level note distinguishes proposed concepts; avoid per-card repetition.
  const top=page.locator('.portal-top-nav a').first();
  const affordance=await top.evaluate(el=>{
   const c=getComputedStyle(el);
   return {border:c.borderTopStyle,color:c.borderTopColor,background:c.backgroundImage,height:el.getBoundingClientRect().height};
  });
  expect(affordance.border).toBe('none');
  expect(affordance.background).toBe('none');
  expect(affordance.height).toBeGreaterThanOrEqual(44);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
 }
 await page.locator('[data-lang=en]').click();
 await expect(page.locator('.portal-concepts-disclaimer')).toContainText('not on-site photographs');
 await page.locator('[data-lang=ne]').click();
 await expect(page.locator('.portal-concept-card figcaption small')).toHaveCount(0);
 await expect(page.locator('.portal-concepts-disclaimer')).toContainText('वास्तविक स्थलका फोटो');
 await page.locator('.portal-top-nav a[href="./golden-himal.html"]').click();
 await expect(page).toHaveURL(/golden-himal\.html$/);
});


test('brand story editorial preview is a discoverable full-card link before the gallery',async({page})=>{
 for(const width of [320,375,390,768,1280]){
  await page.setViewportSize({width,height:820});
  await page.goto('/');
  const entry=page.locator('a.portal-story-entry');
  await expect(entry).toHaveCount(1);
  await expect(page.locator('.portal-about-lead + a.portal-story-entry')).toHaveCount(1);
  await expect(page.locator('a.portal-more')).toHaveCount(0);
  await expect(entry).toHaveAttribute('href','./golden-himal.html');
  await expect(entry).toHaveAttribute('aria-labelledby','portal-story-entry-title');
  await expect(entry.locator('h3')).toContainText('Golden Himal');
  await expect(entry.locator('.portal-story-entry-action')).toContainText('閱讀 Golden Himal 的完整故事');
  const photo=entry.locator('img');
  await expect(photo).toHaveAttribute('src','./images/gh-real-guesthouse-20261113.webp');
  await entry.scrollIntoViewIfNeeded();
  await expect.poll(()=>photo.evaluate(el=>el.complete&&el.naturalWidth>0),{timeout:15000}).toBe(true);
  const dimensions=await entry.evaluate(el=>{
   const r=el.getBoundingClientRect();
   const image=el.querySelector('img').getBoundingClientRect();
   return {width:r.width,height:r.height,imageHeight:image.height,cursor:getComputedStyle(el).cursor};
  });
  expect(dimensions.cursor).toBe('pointer');
  expect(dimensions.height).toBeGreaterThanOrEqual(230);
  expect(dimensions.imageHeight).toBeGreaterThanOrEqual(170);
  if(width<=650)expect(dimensions.width).toBeGreaterThan(width-50);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await entry.locator('.portal-story-entry-media').click();
  await expect(page).toHaveURL(/golden-himal\.html$/);
 }
 await page.goto('/');
 await page.locator('[data-lang=en]').click();
 await expect(page.locator('.portal-story-entry-title')).toContainText('golden morning light');
 await expect(page.locator('.portal-story-entry-action')).toContainText('Read the full Golden Himal story');
 await page.locator('[data-lang=ne]').click();
 await expect(page.locator('.portal-story-entry-title')).toContainText('Golden Himal');
 await expect(page.locator('a.portal-story-entry')).toHaveAttribute('href','./golden-himal.html');
});
