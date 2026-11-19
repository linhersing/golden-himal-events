import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
test('new brand homepage keeps only three routes; original Voice entry remains intact',async()=>{
 const home=await read('index.html'),voice=await read('public/voice.html');
 for(const [id,href] of [['home-about','./golden-himal.html'],['home-competition','./voice.html'],['home-news','./news.html']]){
  assert.match(home,new RegExp('id="'+id+'"[^>]*href="'+href.replaceAll('.','\\.')+'"'));
 }
 assert.equal((home.match(/class="portal-choice(?: portal-choice-primary)?"/g)||[]).length,3);
 assert.match(home,/id="location"/);
 assert.match(home,/27\.666389%2C84\.228333/);
 assert.match(home,/href="\.\/backoffice\.html"/);
 assert.doesNotMatch(home,/id="home-apply"/);
 assert.match(home,/class="test-site-banner test-site-footer wrap"/);
 for(const href of ['./member.html#register','./member.html#login','./news.html']){
  assert.ok(voice.includes('href="'+href+'"'),href);
 }
 assert.match(voice,/data-page="home"/);
 assert.match(voice,/id="home-apply"/);
 assert.match(voice,/id="home-login"/);
 assert.match(voice,/data-t="organizerValue"/);
 assert.match(voice,/data-t="missionDescription"/);
 assert.match(voice,/class="front-footer wrap"/);
 assert.doesNotMatch(home,/<form[^>]+action\s*=/i);
 assert.doesNotMatch(home,/class="v2-rule-summary"|class="season-preview"|id="vote-dialog"/);
});
test('previous site resources and links remain in an immutable design archive',async()=>{
 const html=await read('docs/archive/2026-11-02-index-before-simple-front.html');
 for(const id of ['event','updates','registration','voting','venue'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/id="vote-dialog"/);
 assert.match(html,/href="\.\/practice\.html"/);
});
test('member and staff share server-issued identity but never fake official payments',async()=>{
 const [member,staff,api,backend]=await Promise.all([read('public/member.html'),read('public/backoffice.html'),read('public/simple.js'),read('backend/staging-e2e.js')]);
 assert.match(member,/id="member-email-form"/);assert.match(member,/id="entries"/);assert.match(member,/name="demo_url"/);
 assert.match(staff,/id="paid-count">0/);assert.match(staff,/data-role-tab="reviewer"/);
 for(const path of ['update-application','delete-application','reviewer-queue','organizer-queue'])assert.match(api,new RegExp(path));
 assert.match(backend,/account_id=\?/);assert.match(backend,/payment_status='unpaid'/);
 const locale=await read('public/page-locale.js');
 assert.match(api,/entryReviewKey/); // The member dashboard reports receipt and review.
 assert.doesNotMatch(api,/api\('mock-payment'/);
 assert.match(locale,/No real payment/);
 for(const lang of ['en','ne','zh'])assert.match(locale,new RegExp('"'+lang+'"\\s*:'));
 assert.match(member,/id="start-application"/);
 assert.match(member,/aria-controls="application-details"/);
 assert.match(member,/<select name="song_language"/);
 assert.match(member,/<select name="song_key"/);
 assert.match(member,/id="community-statement"/);
 assert.match(member,/id="university-statement"/);
 assert.match(locale,/60–90 seconds/);
 assert.match(api,/mt\('delete'\)/);
 assert.match(api,/entryReviewKey/);
 assert.match(api,/organizerState/);
 assert.match(api,/callout.hidden=hasEntries/);
 assert.match(member,/data-lang="zh"/);
 assert.match(member,/page-locale\.js/);
});
test('social preview metadata remains neutral and noindex until go live',async()=>{
 const html=await read('index.html');
 assert.match(html,/property="og:title"/);assert.match(html,/property="og:image"/);
 assert.match(html,/golden-himal-voice-preview\.linhersing\.workers\.dev\/images\/ghp-clean-official-logo-20261116\.png/);
 assert.match(html,/noindex,nofollow,noarchive/);
 assert.doesNotMatch(html,/\b(?:CMA|Chinese Mission Alliance|wanjun|cma-mission\.com)\b/i);
});
test('home retains English Nepali and Traditional Chinese switch',async()=>{
 const html=await read('index.html'),js=await read('public/brand-portal.js'),voice=await read('public/voice.html'),simple=await read('public/simple.js');
 for(const lang of ['en','ne','zh']){
  assert.match(html,new RegExp('data-lang="'+lang+'"'));
  assert.match(voice,new RegExp('data-lang="'+lang+'"'));
  assert.match(js,new RegExp('"'+lang+'"\\s*:\\s*\\{'));
  assert.ok(simple.includes(lang+':{'));
 }
});

test('backoffice roster retains one guarded staff entry and one scoring workbench',async()=>{
 const [html,js]=await Promise.all([read('public/backoffice.html'),read('public/simple.js')]);
 for(const id of ['back-email-form','back-code-form','judge-queue','judge-list','admin-apps','organizer-search']){
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 }
 assert.match(html,/data-page="back"/);
 assert.match(html,/data-role-tab="reviewer"/);
 assert.match(js,/if\(page==='back'\)/);
 assert.match(js,/api\(single\?'january-video-score':'score',payload\)/);
 assert.match(js,/scoresEqual\(readStored\(row\),payload\)/);
 assert.doesNotMatch(js,/ghv_photo_url|ghv_gender/);
});


test('TEST MODE notice remains visible only in footer on home, singer and news pages',async()=>{
 const [home,member,news,css,locale]=await Promise.all([
  read('index.html'),read('public/member.html'),read('public/news.html'),
  read('public/simple.css'),read('public/page-locale.js')
 ]);
 for(const html of [home,member,news]){
  assert.match(html,/class="test-site-banner test-site-footer wrap"/);
  assert.ok(html.indexOf('TEST MODE ·')>html.indexOf('</main>'),'notice must follow main content');
  assert.equal((html.match(/class="test-site-banner test-site-footer wrap"/g)||[]).length,1);
 }
 assert.match(home,/data-p="testNotice"/);
 assert.match(member,/data-l="testNotice"/);
 assert.match(news,/data-l="testNotice"/);
 assert.match(locale,/TEST PREVIEW ONLY/);
 assert.match(locale,/आधिकारिक दर्ता/);
 assert.match(css,/\.test-site-banner\.test-site-footer/);
});

test('frontline rules appear with a concise homepage and expandable schedule',async()=>{
 const [home,news,member,locale]=await Promise.all([
  read('public/voice.html'),read('public/news.html'),read('public/member.html'),read('public/page-locale.js')
 ]);
 assert.match(home,/Golden Himal Palace/);
 assert.match(home,/Synergy FM.*Kalika FM/);assert.doesNotMatch(home,/待正式確認後公告/);
 assert.match(home,/帶動尼泊爾音樂發展/);
 assert.equal((home.match(/class="choice(?: choice-main)?"/g)||[]).length,3);
 for(const field of ['scheduleJan','scheduleMar','scheduleApr','scheduleJun','scheduleSep']){
  assert.match(news,new RegExp('data-l="'+field+'"'));
  assert.match(locale,new RegExp('"'+field+'"'));
 }
 assert.match(news,/class="news-row" id="rules-schedule"><summary>/);
 assert.match(member,/class="full evidence-plan evidence-required"/);
 assert.doesNotMatch(member,/<input[^>]*name="eligibility"/);
 assert.match(locale,/安全上傳待開通/);
});

test('main singer page contains no-email TEST member controls, retains invited login and TEST warning',async()=>{
 const [html,ui,backend,migration]=await Promise.all([
  read('public/member.html'),read('public/password-member.js'),
  read('backend/staging-e2e.js'),read('backend/migrations/1005_password_members_STAGING_ONLY.sql')
 ]);
 for(const id of ['password-portal','password-login-form','password-register-form','password-recover-form','password-recovery-output','member-email-form']){
  assert.ok(html.includes('id="'+id+'"'),'missing '+id);
 }
 assert.match(html,/password-member\.js/);
 assert.match(html,/data-l="testNotice"/);
 assert.match(ui,/password-config/);
 assert.match(backend,/passwordRequest/);
 assert.match(migration,/e2e_password_accounts/);
 assert.doesNotMatch(ui,/localStorage\.setItem\([^)]*(password|recovery)/i);
 assert.doesNotMatch(html,/value="GHV-[0-9A-F-]+"/);
});

test('singer video guidance has explicit quality, lighting, sound and accessible sharing instructions',async()=>{
 const [html,locale,css,ui,backend]=await Promise.all([
  read('public/member.html'),read('public/page-locale.js'),read('public/simple.css'),
  read('public/simple.js'),read('backend/staging-e2e.js')
 ]);
 for(const field of ['videoGuideTitle','videoGuideBody','videoTechToggle','videoTechPicture',
 'videoTechFraming','videoTechLighting','videoTechSound','videoTechFile',
 'videoTechAccess','videoHelp','videoConfirm']){
  assert.match(html,new RegExp('data-l="'+field+'"'));
  assert.match(locale,new RegExp('"'+field+'"'));
 }
 assert.match(html,/<details class="audition-technical">/);
 assert.match(html,/name="demo_url" type="url"/);
 assert.match(html,/name="video_confirmed" type="checkbox" required/);
 assert.match(locale,/1920 × 1080/);
 assert.match(locale,/1280 × 720/);
 assert.match(locale,/無痕視窗/);
 assert.match(locale,/Anyone with the link/);
 assert.match(locale,/अनुहार/);
 assert.match(css,/audition-technical summary:focus-visible/);
 assert.match(ui,/video_confirmed:application\.querySelector/);
 assert.match(backend,/video_self_recording_confirmation_required/);
});

test('Golden Himal Palace story presents architecture without provenance chatter',async()=>{
 const [home,story,styles,language]=await Promise.all([
  read('index.html'),read('public/golden-himal.html'),read('public/brand-portal.css'),read('public/brand-portal.js')
 ]);
 const gallery=["gh-reviewed-20261115-buffet.jpg","gh-reviewed-20261115-fountain-night.jpg","gh-reviewed-20261115-main-building-night.jpg","gh-reviewed-20261115-grand-hall-empty.jpg","gh-reviewed-20261115-golden-dining.jpg","gh-reviewed-20261115-fountain-day.jpg","approved-grand-hall-20261114.jpg","gh-20261115-a-entrance-night-10.jpg","gh-20261115-golden-gathering-11.jpg","gh-20261115-carved-door-14.jpg"];
 for(const file of gallery){
  assert.ok((home+story).includes(file),file);
 }
 assert.doesNotMatch(story,/gh-real-chandelier-detail-20261113\\.webp/); // Discard unflattering unfinished-lighting close-up from the public story\n assert.match(home,/gh-reviewed-20261115-grand-hall-empty\.jpg/); // Actual A-frame exterior at night, verified from image bytes\n assert.doesNotMatch(story,/golden-himal-phase2-visualization|golden-himal-phase2-construction|<[^>]+>第一期|<[^>]+>第二期/);
 assert.doesNotMatch(home,/第一期建築實景/);
 assert.doesNotMatch(story,/class="gallery-disclaimer"/);
 assert.doesNotMatch(home+story,/AI 修飾形象影像/);
 assert.doesNotMatch(story,/<small data-p="galleryEnhanced">/);
 assert.doesNotMatch(home,/class="portal-concepts-disclaimer"/);
 assert.doesNotMatch(home+story,/設計示意|並非現場實拍|已完工照片|實際拍攝|實拍照片/);
 assert.match(home,/data-p="designViewsHeading">建築與空間特色/);
 assert.doesNotMatch(home+story,/gh-gallery-(?:grand-hall|sky-lounge|fountain-day|guesthouse-night|mountain-view|lamaste-tower)-ai\\.webp/);
 assert.doesNotMatch(home+story,/gh-real-fountain-20261113\\.webp/);
 assert.match(story,/href="\.\/golden-himal\.html" data-ghp-nav="about" aria-current="page"/);
 assert.equal((story.match(/class="portal-top-nav ghp-shared-nav"/g)||[]).length,1);
 assert.match(home,/class="portal-top-nav"/);
 assert.match(home,/class="portal-about wrap"/);
 assert.match(home,/class="portal-photo-grid"/);
 assert.ok(home.includes("gh-real-hall-hero-20261113.webp"));
 assert.ok(styles.includes(".portal-stage.portal-hero"));
 assert.match(story,/data-p="journeyHeading"/);
 assert.match(story,/data-p="journeyText"/);
 assert.match(story,/data-p="journeyNext"/);
 assert.match(story,/class="story-more"/);
 assert.match(story,/data-p="goldenText"/);
 assert.match(story,/data-p="himalText"/);
 assert.match(story,/data-p="palaceText"/);
 assert.match(story,/id="location"/);
 assert.match(home,/id="home-competition"/);
 for(const label of ['galleryHall','galleryLounge','galleryWater','galleryNight','galleryGateway','galleryView','galleryMore']){
  assert.match(language,new RegExp('"'+label+'"'));
 }
 assert.match(language,/ghv_ui_language_v1/);
 assert.match(styles,/@media\(max-width:520px\)/);
 assert.doesNotMatch(story,/class="v2-rule-summary"|id="registration-form"/);
});


test('approved Golden Himal Palace public call line is reachable on all visitor pages',async()=>{
 const files=['index.html','public/golden-himal.html','public/voice.html','public/news.html','public/member.html'];
 for(const path of files){
  const html=await read(path);
  assert.equal((html.match(/id="contact"/g)||[]).length,1,path+' should have one contact destination');
  assert.equal((html.match(/href="tel:\+9779801199996"/g)||[]).length,1,path+' must link only to the verified phone');
  assert.match(html,/\+977 9801199996/,path+' must display the full Nepal international number');
  assert.doesNotMatch(html,/mailto:\s*(?:fake|support@example|test@)/i,path+' must not advertise a fake support mailbox');
 }
 for(const file of ['public/page-locale.js','public/brand-portal.js','public/simple.js']){
  const script=await read(file);
  assert.match(script,/contactHeading/);
  assert.match(script,/contactIntro/);
  assert.match(script,/contactCall/);
  assert.match(script,/contactNote/);
 }
 const news=await read('public/news.html'),member=await read('public/member.html');
 assert.match(news,/href="#contact" data-l="contactNav"/);
 assert.match(member,/href="#contact" data-l="contactNav"/);
 assert.match(await read('public/voice.html'),/href="#contact" data-t="contactShortcut"/);
 const css=await read('public/simple.css');
 assert.match(css,/\.ghv-contact-call:focus-visible/);
 assert.match(css,/@media\(max-width:690px\)/);
});


test('rules and updates have distinct destinations without changing existing contest URLs',async()=>{
 const [home,voice,news,announcements,member,locale,brand,simple]=await Promise.all([
  read('index.html'),read('public/voice.html'),read('public/news.html'),
  read('public/announcements.html'),read('public/member.html'),read('public/page-locale.js'),
  read('public/brand-portal.js'),read('public/simple.js')
 ]);
 assert.match(home,/id="home-news" class="portal-choice" href="\.\/news\.html"/);
 assert.match(home,/href="\.\/announcements\.html" data-p="announcementsLink"/);
 assert.match(voice,/href="\.\/announcements\.html" data-t="announcementsShortcut"/);
 assert.match(voice,/data-t="talentLead"/);
 assert.match(news,/href="\.\/announcements\.html" data-l="announcementsNav"/);
 assert.match(news,/aria-current="page" data-l="rulesNav"/);
 assert.match(announcements,/aria-current="page" data-l="announcementsNav"/);
 assert.match(announcements,/href="\.\/news\.html" data-l="rulesNav"/);
 assert.match(member,/href="\.\/news\.html" data-l="rulesReadAction"/);
 assert.match(news,/id="rules-awards"/);
 for(const url of ['./member.html#register','./member.html#login','./news.html']){
  assert.ok(voice.includes('href="'+url+'"'),"existing primary route "+url);
 }
 assert.match(announcements,/href="tel:\+9779801199996"/);
 assert.doesNotMatch(announcements,/winner-item|announced-winners|confirmed-results/);
 for(const term of ['rulesNav','announcementsTitle','announcementsEmptyTitle','rulesRequiredHeading']){
  assert.ok(locale.includes(term),"missing localized key "+term);
 }
 assert.match(brand,/announcementsLink/);
 assert.match(simple,/page==='announcements'/);
});


test('brand pages omit image provenance claims in all languages while retaining safe TEST notice',async()=>{
 const [home,story,locale,legacy]=await Promise.all([
  read('index.html'),read('public/golden-himal.html'),
  read('public/brand-portal.js'),read('src/scripts/main.js')
 ]);
 const banned=/以下兩張為依據|設計示意圖|非現場實拍|並非現場實拍|已完工照片|not on-site photographs|proof of completed construction|वास्तविक स्थलका फोटो|gallery-disclaimer|portal-concepts-disclaimer/;
 assert.doesNotMatch(home+story+locale,banned);
 assert.doesNotMatch(locale,/imageDisclaimer|designViewsIntro/);
 assert.doesNotMatch(legacy,/Concept design · Not a venue photograph|品牌視覺示意 · 非場地實景照片|Hall photography pending|宴會廳照片待補/);
 assert.doesNotMatch(home+story,/gh-reviewed-20261115-a-entrance-night\.jpg/); // Image actually shows unfinished hall and construction materials
 assert.match(home,/src="\.\/images\/gh-reviewed-20261115-fountain-day\.jpg"[^>]*alt="宴會大餐廳內觀/);
 assert.match(home,/data-p="designFountainTitle">信望愛・噴水池廣場/);
 assert.match(home,/data-p="designTowerTitle">和平塔・A 字型入口/);
 assert.match(home,/data-p="homePhotoFountain">大餐廳・金色拱頂/);
 assert.doesNotMatch(story,/gh-reviewed-20261115-fountain-day\.jpg/); // Same image must not appear twice across the site
 assert.match(home,/approved-grand-hall-20261114\.jpg/);
 assert.match(home,/approved-peace-tower-20261114\.jpg/);
 assert.match(legacy,/Do not enter real personal information/);
 assert.match(home,/正式比賽報名尚未開放/); // 2026-11-18 Muse/Alan: public notice omits payment
});


test('venue images honor latest photo exclusions, with no duplicate within a page',async()=>{
 const home=await read('index.html'),story=await read('public/golden-himal.html');
 const imgs=html=>[...html.matchAll(/<img[^>]+src="\.\/images\/([^"]+)"/g)]
   .map(m=>m[1]).filter(name=>!['brand-identity.png','ghp-clean-official-logo-20261116.png'].includes(name));
 const a=imgs(home),b=imgs(story);
 const combined=[...a,...b];
 assert.equal(new Set(a).size,a.length,'homepage photos must not repeat within homepage');
 assert.equal(new Set(b).size,b.length,'story photos must not repeat within story');
 // Curated cross-page reuse is intentional: quality overrides a global uniqueness rule.
 for(const banned of ['gh-20261115-building-front-13.jpg','gh-20261115-hall-activity-02.jpg','gh-20261115-a-entrance-day-03.jpg']){
  assert.ok(!combined.includes(banned),`rejected photo still visible: ${banned}`);
 }
 const required=["gh-reviewed-20261115-buffet.jpg","gh-reviewed-20261115-fountain-night.jpg","gh-reviewed-20261115-main-building-night.jpg","gh-reviewed-20261115-grand-hall-empty.jpg","gh-reviewed-20261115-golden-dining.jpg","gh-reviewed-20261115-fountain-day.jpg","approved-grand-hall-20261114.jpg","gh-20261115-a-entrance-night-10.jpg","gh-20261115-golden-gathering-11.jpg","gh-20261115-carved-door-14.jpg"];
 for(const filename of required){
  assert.ok(combined.includes(filename),`approved photo not used: ${filename}`);
  const data=await readFile(new URL('../public/images/'+filename,import.meta.url));
  assert.ok(data.length>20000,`photo must contain real image bytes: ${filename}`);
  assert.equal(data[0],0xff,'JPEG magic bytes');
  assert.equal(data[1],0xd8,'JPEG magic bytes');
 }
 assert.match(story,/data-p="galleryGateway">木雕主門設計/);
 const oldLinks=html=>[...html.matchAll(/\bhref="([^"]+)"/g)].map(x=>x[1]);
 assert.ok(oldLinks(story).includes('./voice.html'));
});

test('owner-provided clean Palace logo is original PNG and home navigation URLs survive redesign',async()=>{
 const html=await read('index.html');
 const logo=await readFile(new URL('../public/images/ghp-clean-official-logo-20261116.png',import.meta.url));
 assert.equal(logo.length,1148806,'must retain the owner-supplied 1,148,806-byte original PNG');
 assert.deepEqual([...logo.subarray(0,8)],[137,80,78,71,13,10,26,10]);
 assert.match(html,/class="ghp-home-logo"/);
 assert.match(html,/width="2048" height="1082"/);
 assert.doesNotMatch(html,/class="brand gh-brand-lockup"/);
 for(const href of ['./','./golden-himal.html','./voice.html','./news.html','./backoffice.html']){
  assert.ok(html.includes('href="'+href+'"'),'preserve original link: '+href);
 }
});
