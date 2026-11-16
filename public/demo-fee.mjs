// Authoritative 2026-11-16 frontline Word: free online audition; later stages charged per person.
// Informational-only cost model. This does not enable D1 registration, real collection or checkout.
export const DEMO_FEE_NPR=0;
export const MAX_DEMOS=5;
export const STAGE_FEES_NPR=Object.freeze({
 audition:0,
 first_selection:0,
 second_selection:300,
 pk:500
});
export function demoFeeQuote(count){
 const value=Number(count);
 if(!Number.isInteger(value)||value<1||value>MAX_DEMOS)throw new RangeError('demo_count_must_be_between_1_and_5');
 return Object.freeze({count:value,unitFeeNpr:DEMO_FEE_NPR,totalNpr:0});
}
export function stageFeeQuote(stage,people=1){
 const count=Number(people);
 if(!Object.hasOwn(STAGE_FEES_NPR,stage))throw new RangeError('unknown_stage');
 if(!Number.isInteger(count)||count<1)throw new RangeError('invalid_entrant_count');
 const unitFeeNpr=STAGE_FEES_NPR[stage];
 return Object.freeze({stage,people:count,unitFeeNpr,totalNpr:count*unitFeeNpr});
}
// Retained only for old private previews that contain a Demo-count widget.
// The public 2027 competition rules never mount a multi-Demo price estimator.
export function mountDemoFeeEstimator(doc,win){
 const slider=doc?.getElementById?.('demo-fee-count');
 const total=doc?.getElementById?.('demo-fee-total');
 const counter=doc?.getElementById?.('demo-fee-count-output');
 if(!slider||!total||!counter)return false;
 const render=()=>{
  const amount=demoFeeQuote(slider.value);
  const lang=win?.GHVLocale?.lang||'en';
  const unit=lang==='zh'?'支':lang==='ne'?'डेमो':amount.count===1?'Demo':'Demos';
  counter.textContent=amount.count+' '+unit;
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
