import {ENTRY_FEE_NPR,emptyPayments,newMockOrder,mockProviderEvent,mockPaymentSummary} from './payment-lab-model.mjs';
// Browser localStorage only. DO NOT connect real money, identity, cards or payment credentials.
const $=id=>document.getElementById(id);
const PAYMENT_KEY='ghv_payment_mock_v1';
const LAB_KEY='ghv_internal_synthetic_lab_v1';
const statusLabels={pending:'待付款',paid:'模擬已付款',failed:'模擬失敗',
 refund_pending:'模擬退款處理中',refunded:'模擬已退款'};
let payments=emptyPayments();
function readRegistrations(){
 try{
  const parsed=JSON.parse(localStorage.getItem(LAB_KEY)||'null');
  if(!parsed||!Array.isArray(parsed.registrations))return [];
  return parsed.registrations.filter(x=>/^GHV-TEST-[0-9]{4,}$/.test(x.id)&&
    /^T00[1-6]$/.test(x.person)&&/^2027-(03|06|09)$/.test(x.round)).slice(0,18);
 }catch{return []}
}
try{
 const x=JSON.parse(localStorage.getItem(PAYMENT_KEY)||'null');
 if(x&&x.version===1&&Number.isSafeInteger(x.sequence)&&x.sequence>=1&&x.sequence<1000&&
    Array.isArray(x.orders)&&x.orders.length<=18&&Array.isArray(x.events)&&x.events.length<=120&&
    x.orders.every(o=>o?.mode==='TEST_ONLY'&&o.amount===ENTRY_FEE_NPR&&o.currency==='NPR'&&
      /^GHV-TEST-[0-9]{4,}$/.test(o.registrationId)&&/^PAY-TEST-[0-9]{4,}$/.test(o.id)&&
      Object.hasOwn(statusLabels,o.state)))
  payments=x;
}catch{}
function save(){try{localStorage.setItem(PAYMENT_KEY,JSON.stringify(payments))}catch{}}
function text(el,v){el.textContent=String(v)}
function boxCell(v){const td=document.createElement('td');if(v instanceof Node)td.append(v);else text(td,v);return td}
function button(name,event,orderId){
 const b=document.createElement('button');b.type='button';b.className='subtle';text(b,name);
 b.addEventListener('click',()=>{
  const result=mockProviderEvent(payments,orderId,event);
  if(result.error){text($('payment-message'),'拒絕非法狀態轉換：'+result.error);return}
  save();render();
  text($('payment-message'),result.unchanged?
   '重複通知已忽略：金額沒有增加。':
   '已執行虛構事件 '+event+'；未向任何銀行扣款。');
 });
 return b;
}
function render(){
 const reg=$('reg');const previous=reg.value;reg.replaceChildren();
 const rows=readRegistrations();
 if(!rows.length)reg.add(new Option('請先回報名測試室建立一筆虛構報名',''));
 else {
  rows.forEach(r=>reg.add(new Option(r.id+' · '+r.person+' · '+r.round,r.id)));
  if(rows.some(x=>x.id===previous))reg.value=previous;
 }
 $('create').disabled=!rows.length;
 const root=$('orders');root.replaceChildren();
 if(!payments.orders.length){
  const tr=document.createElement('tr');const td=boxCell('尚無模擬付款訂單');
  td.colSpan=4;tr.append(td);root.append(tr);
 }
 for(const o of [...payments.orders].reverse()){
  const tr=document.createElement('tr');
  const id=document.createElement('div');
  const bold=document.createElement('strong');text(bold,o.id);
  const small=document.createElement('small');text(small,o.registrationId+' · '+o.round);
  id.append(bold,document.createElement('br'),small);
  const actions=document.createElement('div');actions.className='row-actions';
  if(o.state==='pending'){actions.append(button('模擬付款成功','succeeded',o.id),
    button('模擬付款失敗','failed',o.id));}
  if(o.state==='failed')actions.append(button('模擬重試','retry',o.id));
  if(o.state==='paid')actions.append(button('重播成功通知','succeeded',o.id),
    button('申請模擬退款','refund_requested',o.id));
  if(o.state==='refund_pending')actions.append(button('模擬退款完成','refunded',o.id),
    button('模擬退款拒絕','refund_rejected',o.id));
  if(o.state==='refunded')actions.append(button('重播退款通知','refunded',o.id));
  tr.append(boxCell(id),boxCell('NPR '+o.amount),boxCell(statusLabels[o.state]),boxCell(actions));
  root.append(tr);
 }
 const summary=mockPaymentSummary(payments);
 const stats=[['TEST 訂單',summary.orders],['待付款',summary.pending],['模擬已付',summary.paid],
  ['模擬退款完成',summary.refunded],['模擬累計收款','NPR '+summary.grossNpr],
  ['模擬淨額','NPR '+summary.netNpr]];
 const metrics=$('payment-stats');metrics.replaceChildren();
 for(const [label,value] of stats){
  const el=document.createElement('div');el.className='metric';
  const number=document.createElement('strong');text(number,value);
  const title=document.createElement('span');text(title,label);
  el.append(number,title);metrics.append(el);
 }
}
$('create').addEventListener('click',()=>{
 const reg=readRegistrations().find(r=>r.id===$('reg').value);
 const result=newMockOrder(payments,reg);
 if(result.error){text($('create-status'),result.error);return}
 save();render();text($('create-status'),result.order.id+(result.existing?' 已存在，沒有重複建立。':' 已建立（不扣真錢）。'));
});
$('reset-payments').addEventListener('click',()=>{
 if(!confirm('清除本機 TEST 訂單與模擬金額？無任何真實付款受到影響。'))return;
 payments=emptyPayments();save();render();
 text($('payment-message'),'本機金流演練已歸零。');
});
$('export').addEventListener('click',()=>{
 const blob=new Blob([JSON.stringify({type:'TEST_PAYMENT_ONLY',payments},null,2)],
   {type:'application/json'}),url=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=url;a.download='ghv-payment-mock-only.json';a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
});
render();
