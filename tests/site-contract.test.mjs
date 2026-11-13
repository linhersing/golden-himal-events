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
 assert.match(api,/mt\('testComplete'\)/); // TEST receipt must remain explicitly non-official
 assert.match(api,/result\.testOnly!==true/);
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
 assert.match(api,/payment_status==='simulated_paid'/);
 assert.match(api,/callout.hidden=hasEntries/);
 assert.match(member,/data-lang="zh"/);
 assert.match(member,/page-locale\.js/);
});
test('social preview metadata remains neutral and noindex until go live',async()=>{
 const html=await read('index.html');
 assert.match(html,/property="og:title"/);assert.match(html,/property="og:image"/);
 assert.match(html,/golden-himal-voice-preview\.linhersing\.workers\.dev\/images\/brand-identity\.png/);
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
 assert.match(js,/api\('score',payload\)/);
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
 assert.match(home,/Synergy FM/);assert.match(home,/Kalika FM/);
 assert.match(home,/帶動尼泊爾音樂發展/);
 assert.equal((home.match(/class="choice(?: choice-main)?"/g)||[]).length,3);
 for(const field of ['scheduleJan','scheduleMar','scheduleApr','scheduleJun','scheduleSep']){
  assert.match(news,new RegExp('data-l="'+field+'"'));
  assert.match(locale,new RegExp('"'+field+'"'));
 }
 assert.match(news,/class="news-row" open/);
 assert.match(member,/class="full evidence-plan"/);
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

test('Golden Himal Palace story uses optimized on-site-photo-based AI imagery, avoids phase boards and discloses enhancements',async()=>{
 const [home,story,styles,language]=await Promise.all([
  read('index.html'),read('public/golden-himal.html'),read('public/brand-portal.css'),read('public/brand-portal.js')
 ]);
 const gallery=['grand-hall','grand-hall-elevated','sky-lounge','fountain-day','fountain-night','lamaste-tower','guesthouse-night','mountain-view'];
 for(const file of gallery){
  assert.match(home+story,new RegExp('gh-gallery-'+file+'-ai\\.webp'));
 }
 assert.doesNotMatch(story,/golden-himal-phase2-visualization|golden-himal-phase2-construction|<[^>]+>第一期|<[^>]+>第二期/);
 assert.doesNotMatch(home,/第一期建築實景/);
 assert.match(story,/data-p="imageDisclaimer"/);
 assert.match(story,/AI 修飾形象影像/);
 assert.match(story,/class="story-more"/);
 assert.match(story,/data-p="goldenText"/);
 assert.match(story,/data-p="himalText"/);
 assert.match(story,/data-p="palaceText"/);
 assert.match(story,/id="location"/);
 assert.match(home,/id="home-competition"/);
 for(const label of ['galleryHall','galleryLounge','galleryWater','galleryNight','galleryTower','galleryWaterNight','galleryView','galleryMore','imageDisclaimer']){
  assert.match(language,new RegExp('"'+label+'"'));
 }
 assert.match(language,/ghv_ui_language_v1/);
 assert.match(styles,/@media\(max-width:520px\)/);
 assert.doesNotMatch(story,/class="v2-rule-summary"|id="registration-form"/);
});
