import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('all standalone HTML pages end with approved original logo',()=>{
 for(const name of readdirSync(new URL('../public/',import.meta.url)).filter(n=>n.endsWith('.html'))){
  const source=read('public/'+name);
  if(name==='golden-himal.html')continue;
  assert.match(source,/ghp-universal-footer-brand/,name);
  assert.match(source,/ghp-clean-official-logo-20261116\.png/,name);
  assert.match(source,/सबैभन्दा राम्रो विवाह समारोह गोल्डेन हिमालमा।/,name);
 }
});
test('member controls use authenticated D1 endpoints',()=>{
 const html=read('public/member.html'),script=read('public/simple.js');
 for(const id of ['member-manage-edit','member-manage-delete'])assert.ok(html.includes('id="'+id+'"'));
 assert.ok(script.includes("api('delete-my-data',{})"));
 assert.ok(script.includes("rows.find(memberCanEdit)"));
 assert.ok(script.includes("phrase!=='DELETE'"));
 const backend=read('backend/staging-e2e.js');
 assert.ok(backend.includes("pathname==='/api/e2e/delete-my-data'"));
});
test('full-width prize area keeps the link and published amounts',()=>{
 const html=read('public/voice.html'),css=read('public/simple.css');
 for(const value of ['NPR 50,000','NPR 30,000','NPR 15,000','NPR 20,000'])assert.ok(html.includes(value));
 assert.ok(html.includes('href="./news.html#rules-awards"'));
 assert.ok(html.includes('voice-prize-grid'));
 assert.ok(css.includes('.voice-prize-link:hover'));
 assert.ok(css.includes('calc(100vw - 32px)'));
});

test('Palace footer reuses approved Chitwan photo under mobile-safe gradients',()=>{
 const selectors=[['public/simple.css','.ghp-universal-footer-brand'],['public/palace-brand-footer.css','.ghp-universal-footer-brand'],['public/brand-portal.css','.portal-footer .ghp-footer-brand']];
 for(const [path,selector] of selectors){
  const css=read(path);
  assert.ok(css.includes(selector),path+' needs its own brand component');
  assert.match(css,/gh-real-chitwan-view-20261113\.webp/);
  assert.match(css,/radial-gradient\(/);
  assert.match(css,/background-size:cover!important/);
  assert.match(css,/@media\(max-width:650px\)/);
 }
 const img=readFileSync(new URL('../public/images/gh-real-chitwan-view-20261113.webp',import.meta.url));
 assert.ok(img.byteLength>20000&&img.byteLength<300000,'existing real panorama must stay small and unchanged');
});

test('first-time singer sees application action before account deletion, with no URL changes',()=>{
 const h=read('public/member.html');
 assert.ok(h.indexOf('id="new-application-callout"')<h.indexOf('id="member-account-tools"'));
 assert.ok(h.indexOf('id="application-details"')<h.indexOf('id="member-account-tools"'));
 assert.ok(h.indexOf('id="member-manage-delete"')>h.indexOf('id="application-form"'));
 const css=read('public/simple.css');
 assert.match(css,/#member-panel > #member-account-tools\{order:3\}/);
});

test('Muse form is present but cannot collect private fields before approved migration',()=>{
 const h=read('public/member.html'),script=read('public/simple.js'),backend=read('backend/staging-e2e.js');
 const start=h.indexOf('id="muse-test-fields"');
 assert.ok(start>0&&h.slice(start,start+170).includes('disabled'));
 for(const key of ['full_name','contact_phone','contact_email','city','street_address','educational_background','short_description','musical_training']){
  assert.ok(h.includes('name="'+key+'"'),key);
 }
 assert.ok(h.includes('data-l="museRegionLock"'));
 assert.match(script,/setupMuseForm\(v\.muse_form_enabled===true\)/);
 assert.match(backend,/museAuditionReady\(env\)/);
 assert.match(backend,/muse_fields_not_enabled/);
 const migration=read('backend/migrations/1013_muse_audition_details_STAGING_ONLY.sql');
 assert.match(migration,/CREATE TABLE IF NOT EXISTS e2e_muse_audition_details/);
 assert.match(migration,/ON DELETE CASCADE/);
});

test('member form is expanded by default and neutral labels replace collaborator names',()=>{
 const h=read('public/member.html'),js=read('public/simple.js'),locale=read('public/page-locale.js');
 assert.match(h,/<section class="panel application-panel" id="application-details"/);
 assert.match(h,/<h2 id="application-form-heading" class="application-title"/);
 assert.doesNotMatch(h,/<details class="panel application-panel"/);
 assert.doesNotMatch(h,/Muse audition information/);
 assert.doesNotMatch(h,/aria-expanded="false"/);
 assert.ok(h.includes('id="muse-test-fields" class="full muse-test-fields" disabled'));
 assert.match(js,/box\.disabled=false/);
 assert.match(js,/musePreviewCannotSave/);
 assert.match(js,/if\(form\)form\.hidden=hasEntries&&!secondAudition/);
 assert.doesNotMatch(js,/details\.addEventListener\('toggle',syncStart\)/);
 assert.match(locale,/"museTitle":"報名資料"/);
 assert.doesNotMatch(locale,/Muse 海選個人資料|Muse audition information|Muse अडिसन जानकारी/);
});

test('November 16 frontline 2027 form has up to five DEMO slots, dates, safe proof boundary',()=>{
 const html=read('public/member.html'),js=read('public/simple.js'),locale=read('public/page-locale.js'),css=read('public/simple.css');
 for(let i=2;i<=5;i++){assert.match(html,new RegExp('data-demo-slot="'+i+'"'));assert.match(html,new RegExp('name="demo_'+i+'_url"'));}
 assert.match(html,/id="demo-add"/);
 assert.match(html,/data-l="entryPeriodDates"/);
 assert.match(html,/data-l="scheduleCaveat"/);
 assert.match(html,/data-l="proofUniversity"/);
 assert.match(html,/data-l="proofCommunity"/);
 assert.doesNotMatch(html,/大學組：有效學生證|社會組：年滿18歲證明/);
 assert.doesNotMatch(html,/at least 14 days/);
 assert.match(locale,/2027年1月1日至1月31日/);
 assert.match(js,/selectedDemos.length>1&&!fiveDemoEnabled/);
 assert.match(js,/payload.demo_entries=selectedDemos/);
 assert.match(js,/verifiedDemoEntries/);
 assert.match(css,/\.demo-extra-grid/);
});
