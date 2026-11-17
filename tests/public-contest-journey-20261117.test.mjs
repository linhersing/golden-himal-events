import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const voice=read('public/voice.html');
const news=read('public/news.html');
const locale=read('public/page-locale.js');
const voiceLocale=read('public/simple.js');
const css=read('public/contest-timeline.css');

test('five planned stages appear in chronological order, with regions explained once',()=>{
 assert.match(voice,/id="contest-journey"/);
 assert.match(voice,/class="ghv-journey-steps"/);
 assert.equal((voice.match(/class="ghv-step-number"/g)||[]).length,5);
 const dates=[...voice.matchAll(/<time datetime="([^"]+)"/g)].map(x=>x[1]);
 assert.deepEqual(dates,['2027-01-01','2027-02-12','2027-03-05','2027-03-12','2027-04-14']);
 assert.match(voice,/只有一個競賽組別/);
 assert.match(voice,/其他地區符合資格者也可選擇一區/);
 assert.match(voice,/自願參加的賽前音樂培訓/);
 assert.match(voice,/尼泊爾當地時間/);
 assert.match(voice,/官網有效投票51%與專業評審49%/);
 assert.match(voice,/社群按讚不計入正式票數/);
 assert.match(voice,/href="\.\/news\.html#rules-schedule"/);
 assert.doesNotMatch(voice,/每人\s*NPR\s*(300|500)/);
});

test('original public navigation and rule deep links remain available',()=>{
 for(const href of ['./','./golden-himal.html','./voice.html','./news.html','./member.html#register','./member.html#login','./announcements.html','./backoffice.html']){
  assert.ok(voice.includes('href="'+href+'"'),'public URL missing: '+href);
 }
 for(const id of ['rules-schedule','rules-eligibility','rules-demo','rules-registration','rules-awards','rules-selection','rules-voting']){
  assert.ok(news.includes('id="'+id+'"'),'rule anchor missing: '+id);
 }
 assert.doesNotMatch(news,/NPR\s*(300|500)/);
});

test('five-stage schedule has independent Chinese, English, Nepali display strings and mobile CSS',()=>{
 for(const key of ['journeyHeading','journeyRegionNote','journeyDate1','journeyDate2','journeyDate3','journeyDate4','journeyDate5','journeyTraining','journeyNotice','journeyDetails']){
  assert.equal((voiceLocale.match(new RegExp('"'+key+'"\\s*:', 'g'))||[]).length,3,key+' should be translated in three languages');
 }
 for(const key of ['registrationPrepareTitle','registrationPrepareBody','registrationPrepareStatus']){
  assert.equal((locale.match(new RegExp('"'+key+'"\\s*:', 'g'))||[]).length,3,key+' should be translated in three languages');
 }
 assert.match(voice,/href="\.\/contest-timeline\.css"/);
 assert.match(css,/@media\(max-width:690px\)/);
 assert.match(css,/@media\(max-width:360px\)/);
});
