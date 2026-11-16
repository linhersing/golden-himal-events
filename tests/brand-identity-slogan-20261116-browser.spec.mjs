import {test,expect} from '@playwright/test';

const slogan='The Best Wedding at Golden Himal.';
const nepali='सबैभन्दा राम्रो विवाह समारोह गोल्डेन हिमालमा।';
const publicPages=['/','/golden-himal.html','/voice.html','/news.html','/announcements.html','/member.html','/backoffice.html'];

test('original Palace mark and slogan remain legible throughout visitor journey',async({page})=>{
 for(const width of [320,375,390,768,1280]){
  await page.setViewportSize({width,height:850});
  for(const route of publicPages){
   await page.goto(route);
   const brand=page.locator('header .gh-brand-lockup');
   await expect(brand).toBeVisible();
   await expect(brand.locator('.gh-brand-slogan')).toHaveText(slogan);
   await expect(brand).toHaveAttribute('href','./');
   const mark=brand.locator('.gh-brand-mark img');
   await expect(mark).toHaveAttribute('src','./images/brand-identity.png');
   await expect.poll(()=>mark.evaluate(el=>el.complete&&el.naturalWidth>0)).toBeTruthy();
   const markBox=await brand.locator('.gh-brand-mark').boundingBox();
   expect(markBox?.width).toBeGreaterThanOrEqual(width<=370?55:width<=650?69:94);
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
   await expect(page.locator('header .gh-brand-mark img')).toBeVisible();
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
   await expect(logo).toHaveAttribute('src','./images/brand-identity.png');
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
  expect(style.width).toBeGreaterThanOrEqual(width<=650?105:140);
  expect(style.background).toContain('brand-identity.png');
  await expect(page.locator('.portal-scene img')).toHaveAttribute('src','./images/gh-real-hall-hero-20261113.webp');
  await expect(page.locator('.ghp-brand-ribbon img, .ghp-brand-signature img')).toHaveCount(0);
 }
});
