import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../public/'+path,import.meta.url),'utf8');
const news=read('news.html'),voice=read('voice.html'),
 locale=read('page-locale.js'),home=read('simple.js');
const getOverride=(source,prefix)=>{
 const found=source.split('\n').filter(line=>line.startsWith(prefix));
 assert.equal(found.length,1,'single final authoritative override for '+prefix);
 const line=found[0];return JSON.parse(line.slice(line.indexOf('{'),line.lastIndexOf('}')+1));
};
const amounts=['NPR 20,000','NPR 200,000','NPR 50,000','NPR 30,000','NPR 15,000','NPR 215,000','NPR 415,000'];
test('cash arithmetic is fixed and prizes overlap the same 10 finalists, never 19 recipients',()=>{
 assert.equal(10*20000,200000);
 assert.equal(1*50000+3*30000+5*15000,215000);
 assert.equal(200000+215000,415000);
 assert.equal(1+3+5,9);
});
test('news prize overview and quick-navigation fallback reference the SAME ten finalists',()=>{
 const section=news.split('<details class="news-row" id="rules-awards">')[1].split('</details>')[0];
 assert(section.includes('4月14日總決賽共10人'));
 assert(section.includes('同一批10位選手'));
 assert(!section.includes('另10名'));
 assert(!news.includes('9名得獎者＋10名入圍者'));
 for(const amount of amounts)assert(section.includes(amount),amount);
 for(const anchor of ['id="rules-awards"','href="#rules-awards"','href="#rules-selection"','href="#rules-voting"'])
  assert(news.includes(anchor),'keep anchor '+anchor);
 assert.equal((section.match(/class="prize-table"/g)||[]).length,1,'preserve original prize grid');
});
test('zh/en/ne latest authoritative news translations state 10 people and same top 9, with all amounts',()=>{
 for(const localeName of ['zh','en','ne']){
  const t=getOverride(locale,'Object.assign(texts.'+localeName+',{"guideScheduleText":');
  const body=t.awardOverviewBody;
  for(const amount of amounts)assert(body.includes(amount),localeName+' '+amount);
  assert(body.includes('10')||body.includes('१०'),localeName+' ten finalists');
  assert(body.includes('9')||body.includes('९'),localeName+' nine ranking winners');
  assert(!(/9\s*\+\s*10/.test(t.guidePrizeText)),localeName+' no disjoint 9+10');
  assert(t.news05lead.length>30,localeName+' clear summary');
  assert(t.awardOverviewTitle.length>40,localeName+' clear title');
 }
});
test('home teaser voice markup and active zh/en/ne translations use correct same-ten cash amounts',()=>{
 const fallback=voice.match(/<p class="voice-prize-top"[^>]*>([^<]*)<\/p>/)?.[1];
 assert(fallback?.includes('同一批10人'),'home fallback must explain overlap');
 for(const amount of amounts)assert(fallback.includes(amount),'voice fallback '+amount);
 for(const lang of ['zh','en','ne']){
  const t=getOverride(home,'Object.assign(translations.'+lang+',{"entryFeeLabel":');
  const body=t.rewardsTop;
  for(const amount of amounts)assert(body.includes(amount),lang+' '+amount);
  assert(body.includes('10')||body.includes('१०'),lang+' 10 finalists');
  assert(body.includes('9')||body.includes('९'),lang+' top 9');
 }
 for(const target of ['./news.html#rules-awards','./news.html','./member.html#login'])
  assert(voice.includes('href="'+target+'"'),'preserve '+target);
});
