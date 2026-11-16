// 2026-11-16 confirmed: one video link per account, NPR 300 per entry; no public multi-Demo estimator.
// UI-only preview: no collection, upload, registration, identity, D1, or checkout.
export const DEMO_FEE_NPR=300;
export const MAX_DEMOS=1;
export function demoFeeQuote(count){
 const value=Number(count);
 if(!Number.isInteger(value)||value<1||value>MAX_DEMOS){
  throw new RangeError('demo_count_must_be_1');
 }
 return Object.freeze({count:value,unitFeeNpr:DEMO_FEE_NPR,totalNpr:value*DEMO_FEE_NPR});
}
export function mountDemoFeeEstimator(doc,win){
 const slider=doc?.getElementById?.('demo-fee-count');
 const total=doc?.getElementById?.('demo-fee-total');
 const counter=doc?.getElementById?.('demo-fee-count-output');
 if(!slider||!total||!counter)return false;
 const render=()=>{
  const amount=demoFeeQuote(slider.value);
  const lang=win?.GHVLocale?.lang||'en';
  const unit=lang==='zh'?'支':lang==='ne'?'डेमो':amount.count===1?'Demo':'Demos';
  counter.textContent=lang==='zh'?amount.count+' '+unit:amount.count+' '+unit;
  total.textContent='NPR '+amount.totalNpr.toLocaleString('en-US');
 };
 slider.addEventListener('input',render);
 win?.addEventListener?.('ghv:languagechange',render);
 render();
 return true;
}
if(typeof document!=='undefined'&&typeof window!=='undefined'){
 const start=()=>mountDemoFeeEstimator(document,window);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
 else start();
}
