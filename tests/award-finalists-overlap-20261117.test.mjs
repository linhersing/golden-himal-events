import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../public/',import.meta.url);
const source=name=>readFileSync(new URL(name,root),'utf8');
const news=source('news.html'),voice=source('voice.html');
const newsLocale=source('page-locale.js'),homeLocale=source('simple.js');

function latestCopy(sourceText,namespace,lang){
 const marker=namespace==='texts'
  ?'2026-11-17 clarification: one cohort of 10 finalists'
  :'2026-11-17 award clarification: top 9 are within the SAME 10 finalists';
 const text=sourceText.slice(sourceText.indexOf(marker));
 assert.notEqual(text,sourceText,'awards clarification marker is present');
 const match=text.match(new RegExp('Object\\.assign\\('+namespace+'\\.'+lang+',([^\\n]*?)\\);'));
 assert(match,lang+' new localization exists');
 return JSON.parse(match[1]);
}
const stats={finalists:10,finalistAward:20000,first:[1,50000],second:[3,30000],third:[5,15000]};
const finalistTotal=stats.finalists*stats.finalistAward;
const rankTotal=stats.first[0]*stats.first[1]+stats.second[0]*stats.second[1]+stats.third[0]*stats.third[1];
test('ten finalists are the same cohort as the nine rank winners, not nineteen recipients',()=>{
 assert.equal(finalistTotal,200000);
 assert.equal(rankTotal,215000);
 assert.equal(finalistTotal+rankTotal,415000);
 for(const text of [news,voice]){
  assert(text.includes('NPR 200,000'));
  assert(text.includes('NPR 215,000'));
  assert(text.includes('NPR 415,000'));
  assert(!text.includes('9名得獎者＋10名入圍者'));
  assert(!text.includes('9名名次得獎者；另10名'));
 }
});
test('news page localized keys explicitly describe the same 10 finalists and exact cash totals',()=>{
 for(const lang of ['zh','en','ne']){
  const copy=latestCopy(newsLocale,'texts',lang);
  assert.deepEqual(Object.keys(copy).sort(),['awardOverviewBody','awardOverviewTitle','guidePrizeText','news05lead']);
  for(const value of Object.values(copy))assert(value.length>10);
  const body=copy.awardOverviewBody;
  for(const money of ['NPR 20,000','NPR 50,000','NPR 30,000','NPR 15,000',
                        'NPR 200,000','NPR 215,000','NPR 415,000']){
   assert(body.includes(money),lang+' missing '+money);
  }
  assert(lang==='ne'?body.includes('१०')&&body.includes('९'):body.includes('10')&&body.includes('9'));
 }
});
test('voice homepage language copy includes the same 10-person finalist cohort and 9 ranking prizes',()=>{
 for(const lang of ['zh','en','ne']){
  const copy=latestCopy(homeLocale,'translations',lang);
  assert.deepEqual(Object.keys(copy).sort(),['rewardFinalist','rewardsTop']);
  for(const money of ['NPR 20,000','NPR 50,000','NPR 30,000','NPR 15,000',
                       'NPR 200,000','NPR 215,000','NPR 415,000']){
   assert(copy.rewardsTop.includes(money),lang+' missing '+money);
  }
  assert(copy.rewardFinalist.length>12);
 }
});
test('existing award-card monetary amounts and navigation targets remain unchanged',()=>{
 for(const v of ['NPR 50,000','NPR 30,000','NPR 15,000'])assert(news.includes('<strong>'+v+' <small'));
 for(const v of ['NPR 50,000','NPR 30,000','NPR 15,000','NPR 20,000'])assert(voice.includes('<strong>'+v+'</strong>'));
 assert(news.includes('href="#rules-awards"'));
 assert(news.includes('id="rules-awards"'));
 assert(voice.includes('href="./news.html#rules-awards"'));
});
