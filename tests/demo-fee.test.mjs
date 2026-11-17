import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {DEMO_FEE_NPR,MAX_DEMOS,STAGE_FEES_NPR,demoFeeQuote,stageFeeQuote,mountDemoFeeEstimator} from '../public/demo-fee.mjs';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');

test('2026-11-16 online audition is free for 1–5 Demos, not charged per Demo',()=>{
 assert.equal(DEMO_FEE_NPR,0);
 assert.equal(MAX_DEMOS,5);
 for(const count of [1,2,3,4,5])assert.deepEqual(demoFeeQuote(count),{count,unitFeeNpr:0,totalNpr:0});
 for(const count of [0,-1,6,10,2.5,'2.5','',null,undefined,Infinity,NaN]){
  assert.throws(()=>demoFeeQuote(count),RangeError);
 }
});

test('fees are charged per person only at the second selection and PK rounds',()=>{
 assert.deepEqual(STAGE_FEES_NPR,{audition:0,first_selection:0,second_selection:300,pk:500});
 assert.deepEqual(stageFeeQuote('second_selection',3),{stage:'second_selection',people:3,unitFeeNpr:300,totalNpr:900});
 assert.deepEqual(stageFeeQuote('pk',2),{stage:'pk',people:2,unitFeeNpr:500,totalNpr:1000});
 assert.deepEqual(stageFeeQuote('audition',5),{stage:'audition',people:5,unitFeeNpr:0,totalNpr:0});
 for(const invalid of ['invalid','final'])assert.throws(()=>stageFeeQuote(invalid),RangeError);
});

test('Voice and rules pages show latest rules without changing website link destinations',async()=>{
 const [home,rules,locale,member,simple]=await Promise.all(['public/voice.html','public/news.html','public/page-locale.js','public/member.html','public/simple.js'].map(read));
 assert.match(home,/id="contest-journey"/);
 assert.match(home,/每人最多5支，每支60–90秒/);
 assert.match(home,/NPR 50,000/);
 assert.match(home,/NPR 30,000/);
 assert.match(home,/NPR 15,000/);
 assert.match(rules,/2027年4月14日/);
 assert.match(rules,/單一競賽組別/);
 assert.match(rules,/A區Lumbini/);
 assert.match(rules,/NPR 415,000/);
 assert.doesNotMatch(rules,/NPR\\s*(300|500)/);
 assert.match(rules,/id="rules-registration"/);
 assert.doesNotMatch(rules,/id="demo-fee-count"/);
 assert.match(locale,/2026-11-16 authoritative frontline Word/);
 assert.match(locale,/फेब्रुअरी १२/);
 assert.match(simple,/journeyHeading/);
 assert.match(member,/data-l="frontlineFormBoundary"/);
 assert.match(member,/name="demo_url"/);
 for(const link of ['./member.html#register','./member.html#login','./news.html'])assert.ok(home.includes('href="'+link+'"'),link);
});

test('old optional estimator does not mount on current published rules',async()=>{
 const page=await read('public/news.html');
 assert.doesNotMatch(page,/src="\.\/demo-fee\.mjs"/);
 const doc={getElementById(){return null}};
 assert.equal(mountDemoFeeEstimator(doc,{addEventListener(){}}),false);
});
