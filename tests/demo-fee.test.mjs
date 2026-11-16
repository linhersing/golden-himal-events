import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {DEMO_FEE_NPR,MAX_DEMOS,demoFeeQuote,mountDemoFeeEstimator} from '../public/demo-fee.mjs';

const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');

test('one video link per account has an NPR 300 fee, not a multiple-Demo price ladder',()=>{
 assert.equal(DEMO_FEE_NPR,300);
 assert.equal(MAX_DEMOS,1);
 assert.deepEqual(demoFeeQuote(1),{count:1,unitFeeNpr:300,totalNpr:300});
 for(const count of [0,-1,2,5,10,2.5,'2.5','',null,undefined,Infinity,NaN]){
  assert.throws(()=>demoFeeQuote(count),RangeError);
 }
});

test('Voice homepage and rules visibly show NPR 300, and do not advertise a multi-Demo slider',async()=>{
 const [home,rules,locale]=await Promise.all([read('public/voice.html'),read('public/news.html'),read('public/page-locale.js')]);
 assert.match(home,/class="voice-entry-fee"/);
 assert.match(home,/NPR 300/);
 assert.match(home,/data-t="entryFeeNote"/);
 assert.match(rules,/data-l="guideFeeText"/);
 assert.match(rules,/id="demo-fee-estimator"/);
 assert.match(rules,/NPR 300/);
 assert.doesNotMatch(rules,/id="demo-fee-count"/);
 assert.match(locale,/每個參賽帳號僅能提交一支/);
});

test('legacy preview calculator is not mounted on the published rules page',async()=>{
 const page=await read('public/news.html');
 assert.doesNotMatch(page,/src="\.\/demo-fee\.mjs"/);
 const doc={getElementById(){return null}};
 assert.equal(mountDemoFeeEstimator(doc,{addEventListener(){}}),false);
});
