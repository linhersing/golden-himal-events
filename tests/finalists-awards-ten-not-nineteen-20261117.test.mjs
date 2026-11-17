import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const read=name=>readFileSync(new URL('../public/'+name,import.meta.url),'utf8');
const news=read('news.html'),voice=read('voice.html'),locale=read('page-locale.js');

function translated(lang,key){
 const win={dispatchEvent(){}};
 const ctx={
  window:win,document:{documentElement:{},querySelectorAll:()=>[],querySelector:()=>null},
  localStorage:{getItem:()=>lang,setItem(){}},CustomEvent:class {constructor(type,options){this.type=type;this.detail=options?.detail}}
 };
 runInNewContext(locale,ctx,{filename:'page-locale.js',timeout:1500});
 return win.GHVLocale.t(key);
}

test('10 finalists include 9 ranking winners; three languages cannot imply 19 distinct winners',()=>{
 const cases=[
  ['zh',/10位|10人|10位入圍者/,/前9名/,/同一批10位/],
  ['en',/10 finalists/,/top 9/,/same 10 finalists/],
  ['ne',/१० जना|१० फाइनलिस्ट/,/शीर्ष ९/,/तिनै १० जनालाई|यी नै १० जनाको/]
 ];
 for(const [lang,ten,nine,same] of cases){
  const title=translated(lang,'awardOverviewTitle'),body=translated(lang,'awardOverviewBody');
  assert.match(title,ten,lang+' finalist count');
  assert.match(body,nine,lang+' within-10 ranking');
  assert.match(body,same,lang+' same set');
  for(const v of ['NPR 20,000','NPR 200,000','NPR 50,000','NPR 30,000','NPR 15,000','NPR 215,000','NPR 415,000'])
   assert.ok(body.includes(v),lang+' missing '+v);
  assert.ok(!/9 winners \+ 10 finalists|9 ranking winners, plus|9名.*另10名|९ .*र १० फाइनलिस्टलाई छुट्टै/.test(title),
   lang+' must not look like 19 finalists');
  assert.match(translated(lang,'guidePrizeText'),ten);
 }
});
test('prize arithmetic and April 14 final are consistent',()=>{
 assert.equal(10*20000,200000);
 assert.equal(1*50000+3*30000+5*15000,215000);
 assert.equal(200000+215000,415000);
 assert.match(news,/2027年4月14日總決賽的10位選手/);
 assert.match(voice,/4月14日總決賽共有10位選手/);
 assert.match(voice,/前9名另獲名次獎金/);
});
test('original award layout, labels and page links remain available',()=>{
 for(const [html,paths] of [
  [news,['#rules-awards','#rules-selection','#rules-voting']],
  [voice,['./news.html#rules-awards']]
 ]){
  for(const path of paths)assert.ok(html.includes('href="'+path+'"'));
 }
 assert.equal((news.match(/class="prize-table"/g)||[]).length,1);
 assert.equal((news.match(/class="award-overview"/g)||[]).length,1);
 assert.equal((voice.match(/class="voice-prize-tier"/g)||[]).length,4);
 assert.ok(news.includes('data-l="awardOverviewTitle"'));
 assert.ok(news.includes('data-l="awardOverviewBody"'));
 assert.ok(voice.includes('data-t="rewardsTop"'));
});
