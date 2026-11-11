import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
test('home is focused on registration, member login and news only',async()=>{
 const html=await read('index.html');
 assert.match(html,/class="front-actions"/);
 for(const href of ['./member.html#register','./member.html#login','./news.html'])assert.ok(html.includes('href="'+href+'"'),href);
 // One discreet staff link is intentional; it is navigation, never authentication.
 const forbiddenStaffHref=/<a\b[^>]*\bhref\s*=\s*["'][^"']*(?:backoffice|admin-center)[^"']*["']/i;
 assert.match('<a href="./backoffice.html">staff</a>',forbiddenStaffHref);
 assert.match('<a href="./admin-center.html">admin</a>',forbiddenStaffHref);
 assert.equal((html.match(forbiddenStaffHref)||[]).length,1);
 assert.match(html,/<a href="\.\/backoffice.html" class="staff-stealth-link"/);
 assert.match(html,/class="front-footer wrap"/);
 assert.match(html,/網站預覽階段/);
 assert.doesNotMatch(html,/<form[^>]+action\s*=/i);
 assert.doesNotMatch(html,/class="v2-rule-summary"|class="season-preview"|id="vote-dialog"/);
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
 const html=await read('index.html'),js=await read('public/simple.js');
 for(const lang of ['en','ne','zh']){assert.match(html,new RegExp('data-lang="'+lang+'"'));assert.match(js,new RegExp('\\b'+lang+':\\s*\\{'))}
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


test('TEST MODE notice is visible on the public home, member, and news pages',async()=>{
 const [home,member,news,css]=await Promise.all([read('index.html'),read('public/member.html'),read('public/news.html'),read('public/simple.css')]);
 for(const html of [home,member,news]){
  assert.match(html,/class="test-site-banner wrap"/);
  assert.match(html,/請勿正式報名或付款/);
  assert.match(html,/Please do not register or make payments/);
  assert.match(html,/कृपया दर्ता वा भुक्तानी नगर्नुहोस्/);
 }
 assert.match(css,/\.test-site-banner/);
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
 assert.match(html,/請勿正式報名或付款/);
 assert.match(ui,/password-config/);
 assert.match(backend,/passwordRequest/);
 assert.match(migration,/e2e_password_accounts/);
 assert.doesNotMatch(ui,/localStorage\.setItem\([^)]*(password|recovery)/i);
 assert.doesNotMatch(html,/value="GHV-[0-9A-F-]+"/);
});

test('audition video is self-filmed, clear and shareable without account access',async()=>{
 const [html,js,css]=await Promise.all([
  read('public/member.html'),read('public/page-locale.js'),read('public/simple.css')
 ]);
 for(const key of ['videoGuideBody','videoTechPicture','videoTechFraming','videoTechLighting',
  'videoTechSound','videoTechFile','videoTechAccess','videoHelp','videoConfirm']){
  assert.ok(html.includes('data-l="'+key+'"'),'missing accessible video field '+key);
  assert.ok(js.includes('\\\"'+key+'\\\"')||js.includes('"'+key+'"'),'missing translation '+key);
 }
 assert.match(html,/<details class="audition-technical">/);
 assert.match(html,/name="demo_url"/);
 assert.match(html,/name="video_confirmed" type="checkbox" required/);
 assert.match(js,/1920 × 1080/);
 assert.match(js,/1280 × 720/);
 assert.match(js,/1080p/);
 assert.match(js,/720p/);
 assert.match(js,/Google Drive/);
 assert.match(js,/YouTube/);
 assert.match(js,/無痕視窗/);
 assert.match(js,/यो वेबसाइट|अडिसन|भिडियो/);
 assert.match(css,/audition-technical summary:focus-visible/);
 assert.doesNotMatch(html,/name="demo_url"[^>]*type="file"/);
});
