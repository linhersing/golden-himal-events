import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {DEMO_FEE_NPR,MAX_DEMOS,demoFeeQuote,mountDemoFeeEstimator} from '../public/demo-fee.mjs';

test('frontline Demo fee uses exact 500 NPR x 1..10 (no rounding or hidden fees)',()=>{
 assert.equal(DEMO_FEE_NPR,500);
 assert.equal(MAX_DEMOS,10);
 assert.deepEqual(demoFeeQuote(1),{count:1,unitFeeNpr:500,totalNpr:500});
 assert.deepEqual(demoFeeQuote(5),{count:5,unitFeeNpr:500,totalNpr:2500});
 assert.deepEqual(demoFeeQuote(10),{count:10,unitFeeNpr:500,totalNpr:5000});
 for(const count of [0,-1,11,2.5,'2.5','',null,undefined,Infinity,NaN]){
  assert.throws(()=>demoFeeQuote(count),RangeError);
 }
});
test('rules page exposes interactive calculator only; does not claim real multi-Demo upload or payment',async()=>{
 const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
 const [page,locale,script]=await Promise.all([read('public/news.html'),read('public/page-locale.js'),read('public/demo-fee.mjs')]);
 assert.match(page,/id="demo-fee-estimator"/);
 assert.match(page,/id="demo-fee-count" type="range" min="1" max="10"/);
 assert.match(page,/id="demo-fee-total" aria-live="polite"/);
 assert.match(page,/src="\.\/demo-fee\.mjs"/);
 assert.match(page,/data-l="feeCalculatorNote"/);
 for(const name of ['feeCalculatorTitle','feeCalculatorLabel','feeCalculatorNote']){
  assert.match(locale,new RegExp(name));
 }
 for(const unsafe of ['fetch(','localStorage','sessionStorage','XMLHttpRequest','FormData','/api/','document.cookie']){
  assert.equal(script.includes(unsafe),false,'fee estimator must not use '+unsafe);
 }
});
test('fee calculator reacts to chosen quantity and language without backend communication',()=>{
 const events={};
 const slider={value:'5',addEventListener(name,fn){events[name]=fn}};
 const total={textContent:''},counter={textContent:''};
 const doc={getElementById(name){return {'demo-fee-count':slider,'demo-fee-total':total,'demo-fee-count-output':counter}[name]}};
 const win={GHVLocale:{lang:'zh'},addEventListener(name,fn){events[name]=fn}};
 assert.equal(mountDemoFeeEstimator(doc,win),true);
 assert.equal(total.textContent,'NPR 2,500');
 assert.equal(counter.textContent,'5 支');
 slider.value='10';events.input();assert.equal(total.textContent,'NPR 5,000');
 win.GHVLocale.lang='en';events['ghv:languagechange']();assert.equal(counter.textContent,'10 Demos');
});
