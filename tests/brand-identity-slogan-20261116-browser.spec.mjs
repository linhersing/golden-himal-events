import {test,expect} from '@playwright/test';

const slogan='The Best Wedding at Golden Himal.';
const nepali='सबैभन्दा राम्रो विवाह समारोह गोल्डेन हिमालमा।';
const publicPages=['/','/golden-himal.html','/voice.html','/news.html','/announcements.html','/member.html','/backoffice.html'];

test('original Palace mark and slogan remain legible throughout visitor journey',async({page})=>{
 for(const width of [320,375,390,768,1280]){
  await page.setViewportSize({width,height:850});
  for(const route of publicPages){
   await page.goto(route);
   if(route==='/'){
    const heroLogo=page.locator('header .ghp-home-logo');
    await expect(heroLogo).toBeVisible();
    await expect(heroLogo).toHaveAttribute('href','./');
    const mark=heroLogo.locator('img');
    await expect(mark).toHaveAttribute('src','./images/ghp-clean-official-logo-20261116.png');
    await expect.poll(()=>mark.evaluate(el=>el.complete&&el.naturalWidth>0)).toBeTruthy();
    const logoBox=await mark.boundingBox();
    const navBox=await page.locator('header .portal-top-nav').boundingBox();
    const languageBox=await page.locator('header .locale').boundingBox();
    expect(logoBox?.width).toBeGreaterThanOrEqual(width<=370?220:width<=650?270:420);
    expect(logoBox.y+logoBox.height).toBeLessThanOrEqual(navBox.y+1);
    expect(logoBox.y+logoBox.height).toBeLessThanOrEqual(languageBox.y+1);
   } else {
    const brand=page.locator('header .gh-brand-lockup');
    await expect(brand).toBeVisible();
    await expect(brand.locator('.gh-brand-slogan')).toHaveText(slogan);
    await expect(brand).toHaveAttribute('href','./');
    const mark=brand.locator('.gh-brand-mark img');
    await expect(mark).toHaveAttribute('src','./images/brand-identity.png');
    await expect.poll(()=>mark.evaluate(el=>el.complete&&el.naturalWidth>0)).toBeTruthy();
    const markBox=await brand.locator('.gh-brand-mark').boundingBox();
    expect(markBox?.width).toBeGreaterThanOrEqual(width<=370?55:width<=650?69:94);
   }
   const horizontalOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth);
   expect(horizontalOverflow,route+' at '+width+'px').toBeFalsy();
  }
 }
});

test('Palace homepage promotes the official bilingual slogan without changing navigation',async({page})=>{
 await page.goto('/');
 await expect(page.locator('.portal-tagline-official')).toHaveText(slogan);
 await expect(page.locator('.portal-tagline-nepali')).toHaveText(nepali);
 await expect(page.locator('#home-about')).toHaveAttribute('href','./golden-himal.html');
 await expect(page.locator('#home-competition')).toHaveAttribute('href','./voice.html');
 await expect(page.locator('#home-news')).toHaveAttribute('href','./news.html');
 await page.locator('button[data-lang="ne"]').click();
 await expect(page.locator('.portal-tagline-official')).toHaveText(slogan);
 await expect(page.locator('.portal-tagline-nepali')).toHaveText(nepali);
});

test('brand story repeats the exact campaign line while preserving the story navigation',async({page})=>{
 await page.goto('/golden-himal.html');
 await expect(page.locator('.gh-story-slogan')).toHaveText(slogan);
 await expect(page.locator('.portal-top-nav a[aria-current="page"]')).toHaveAttribute('href','./golden-himal.html');
});

test('Palace bilingual slogan stays text-first without duplicate side logos',async({page})=>{
 for(const width of [320,390,1280]){
  await page.setViewportSize({width,height:850});
  for(const route of ['/','/golden-himal.html']){
   await page.goto(route);
   await expect(page.locator('.ghp-brand-ribbon-en')).toHaveText(slogan);
   await expect(page.locator('.ghp-brand-ribbon-ne')).toHaveText(nepali);
   await expect(page.locator('.ghp-signature-en')).toHaveText(slogan);
   await expect(page.locator('.ghp-signature-ne')).toHaveText(nepali);
   await expect(page.locator('.ghp-brand-ribbon img, .ghp-brand-signature img')).toHaveCount(0);
   await expect(page.locator(route==='/'?'header .ghp-home-logo img':'header .gh-brand-mark img')).toBeVisible();
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
   expect(overflow,route+' at '+width+'px').toBeLessThanOrEqual(1);
  }
 }
});

test('Palace footer shows one prominent standalone logo below the three brand lines',async({page})=>{
 for(const width of [320,390,768,1280]){
  await page.setViewportSize({width,height:850});
  for(const route of ['/','/golden-himal.html']){
   await page.goto(route);
   const footer=page.locator('.ghp-footer-brand');
   const name=footer.locator('.ghp-footer-brand-copy strong');
   const logo=footer.locator('img.ghp-footer-main-logo');
   await expect(name).toHaveText('GOLDEN HIMAL PALACE');
   await expect(footer.locator('p[lang=en]')).toHaveText(slogan);
   await expect(footer.locator('p[lang=ne]')).toHaveText(nepali);
   await expect(logo).toHaveCount(1);
   await expect(logo).toHaveAttribute('src',route==='/'?'./images/ghp-clean-official-logo-20261116.png':'./images/brand-identity.png');
   await expect.poll(()=>logo.evaluate(el=>el.complete&&el.naturalWidth>0)).toBeTruthy();
   const copyBox=await footer.locator('.ghp-footer-brand-copy').boundingBox();
   const logoBox=await logo.boundingBox();
   expect(logoBox.y).toBeGreaterThan(copyBox.y+copyBox.height-1);
   expect(logoBox.width).toBeGreaterThanOrEqual(width<=390?250:width<=768?300:390);
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
   expect(overflow,route+' at '+width+'px').toBeLessThanOrEqual(1);
  }
 }
});

test('About Golden Himal section keeps a larger official mark without adding new photographs',async({page})=>{
 for(const width of [320,390,1280]){
  await page.setViewportSize({width,height:850});
  await page.goto('/');
  const marker=page.locator('.portal-about-heading .portal-section-tag');
  const style=await marker.evaluate(el=>{
   const pseudo=getComputedStyle(el,'::before');
   return {width:parseFloat(pseudo.width),background:pseudo.backgroundImage};
  });
  expect(style.width).toBeGreaterThanOrEqual(width<=650?100:122);
  expect(style.background).toContain('brand-identity.png');
  await expect(page.locator('.portal-scene img')).toHaveAttribute('src','./images/gh-real-hall-hero-20261113.webp');
  await expect(page.locator('.ghp-brand-ribbon img, .ghp-brand-signature img')).toHaveCount(0);
 }
});

test('All website and staging pages have footer brand without cropped or squashed geometry',async({page})=>{
 const otherPages=[
  '/voice.html','/news.html','/announcements.html','/member.html','/backoffice.html',
  '/practice.html','/member-login.html','/member-portal.html','/admin-center.html',
  '/test-lab.html','/payment-lab.html','/architecture-preview.html',
  '/e2e-stage.html','/judge-stage.html','/organizer-stage.html','/print-brief.html'
 ];
 for(const width of [320,390,1280]){
  await page.setViewportSize({width,height:850});
  for(const route of otherPages){
   await page.goto(route);
   const footer=page.locator('.ghp-universal-footer-brand');
   await expect(footer).toHaveCount(1);
   await expect(footer.locator('p[lang=en]')).toHaveText(slogan);
   const window=footer.locator('.ghp-universal-logo-window');
   const logo=window.locator('img');
   await expect(logo).toHaveAttribute('src','./images/brand-identity.png');
   await expect.poll(()=>logo.evaluate(el=>el.complete&&el.naturalWidth>0)).toBeTruthy();
   const ratio=await window.evaluate(el=>{
    const img=el.querySelector('img');
    return {viewport:el.getBoundingClientRect().height,image:img.getBoundingClientRect().height};
   });
   expect(ratio.viewport/ratio.image).toBeLessThanOrEqual(.69);
   const footerBox=await footer.boundingBox();
   expect(footerBox.x,route+' footer left at '+width+'px').toBeGreaterThanOrEqual(-1);
   expect(footerBox.x+footerBox.width,route+' footer right at '+width+'px').toBeLessThanOrEqual(width+1);
  }
 }
});
test('Palace footer image is clipped without distortion and stops below PALACE',async({page})=>{
 for(const route of ['/','/golden-himal.html']){
  await page.goto(route);
  const frame=page.locator('.ghp-footer-logo-window');
  const image=frame.locator('img.ghp-footer-main-logo');
  await expect(frame).toHaveCount(1);
  const ratio=await frame.evaluate(el=>{
   const i=el.querySelector('img');
   return {crop:el.clientHeight,width:el.clientWidth,displayWidth:i.getBoundingClientRect().width,displayHeight:i.getBoundingClientRect().height,naturalWidth:i.naturalWidth,naturalHeight:i.naturalHeight};
  });
  if(route==='/'){
   expect(ratio.crop/ratio.displayHeight).toBeCloseTo(1,1);
   await expect(image).toHaveAttribute('src','./images/ghp-clean-official-logo-20261116.png');
  }else{
   expect(ratio.crop/ratio.displayHeight).toBeLessThanOrEqual(.69);
   await expect(image).toHaveAttribute('src','./images/brand-identity.png');
  }
  expect(ratio.displayWidth).toBeGreaterThan(0);
  expect(ratio.displayWidth/ratio.displayHeight).toBeCloseTo(ratio.naturalWidth/ratio.naturalHeight,1);
 }
});

test('homepage clean logo is the first branded visual, and mobile controls remain reachable',async({page})=>{
 for(const width of [320,375,390,414,768,1280]){
  await page.setViewportSize({width,height:850});
  await page.goto('/');
  const image=page.locator('.ghp-home-logo img');
  await expect(image).toHaveAttribute('alt',/Golden Himal Palace/);
  await expect(image).toHaveAttribute('src','./images/ghp-clean-official-logo-20261116.png');
  await expect.poll(()=>image.evaluate(el=>el.complete && el.naturalWidth===2048 && el.naturalHeight===1082)).toBeTruthy();
  await expect(page.locator('.ghp-home-header .gh-brand-lockup')).toHaveCount(0);
  await expect(page.locator('.ghp-home-header .portal-top-nav a')).toHaveCount(4);
  await expect(page.locator('.ghp-home-header .locale button')).toHaveCount(3);
  const bounds=await image.boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(-1);
  expect(bounds.x+bounds.width).toBeLessThanOrEqual(width+1);
  await expect(page.locator('footer a[href="./backoffice.html"]')).toHaveCount(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
 }
});

test('homepage header and wedding slogan share one understated venue-photo background at all viewports',async({page})=>{
 for(const width of [320,375,390,414,768,1280,1640]){
  await page.setViewportSize({width,height:850});
  await page.goto('/');
  const band=page.locator('.ghp-home-atmosphere');
  await expect(band).toHaveCount(1);
  await expect(band.locator('header.ghp-home-header .ghp-home-logo img')).toBeVisible();
  await expect(band.locator('header .portal-top-nav a')).toHaveCount(4);
  await expect(band.locator('.ghp-brand-ribbon-en')).toHaveText(slogan);
  await expect(band.locator('.ghp-brand-ribbon-ne')).toHaveText(nepali);
  const style=await band.evaluate(el=>{
   const wash=getComputedStyle(el,'::before');
   const text=getComputedStyle(el.querySelector('.ghp-brand-ribbon-en'));
   return {image:wash.backgroundImage,background:getComputedStyle(el).backgroundColor,
    color:text.color,filter:wash.filter};
  });
  expect(style.image).toContain('gh-real-hall-hero-20261113.webp');
  expect(style.image).toContain('linear-gradient');
  expect(style.background).not.toBe('rgba(0, 0, 0, 0)');
  expect(style.color).toBe('rgb(102, 59, 34)');
  const bounds=await band.boundingBox();
  const hero=await page.locator('.portal-stage').boundingBox();
  expect(bounds.y+bounds.height).toBeLessThanOrEqual(hero.y+2);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
 }
});
