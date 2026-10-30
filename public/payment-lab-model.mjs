// TEST ONLY. An isolated browser-local simulation; NO real transfers or provider callbacks.
export const ENTRY_FEE_NPR=500;
export const emptyPayments=()=>({version:1,sequence:1,orders:[],events:[]});
const validRegistration=r=>r&&/^GHV-TEST-[0-9]{4,}$/.test(r.id)&&
 ['2027-03','2027-06','2027-09'].includes(r.round)&&/^T00[1-6]$/.test(r.person);
export function newMockOrder(data,registration){
 if(!validRegistration(registration))return {error:'invalid_test_registration'};
 if(!Array.isArray(data.orders)||!Number.isInteger(data.sequence))return {error:'invalid_test_state'};
 const previous=data.orders.find(o=>o.registrationId===registration.id);
 if(previous){
  // A reused TEST registration number must never inherit another person's paid state.
  if(previous.person!==registration.person||previous.round!==registration.round)
   return {error:'stale_payment_order_reset_required'};
  return {order:previous,existing:true};
 }
 const order={id:'PAY-TEST-'+String(data.sequence++).padStart(4,'0'),
  registrationId:registration.id,person:registration.person,round:registration.round,
  amount:ENTRY_FEE_NPR,currency:'NPR',state:'pending',attempt:1,mode:'TEST_ONLY'};
 data.orders.push(order);
 data.events.push({type:'created',orderId:order.id});
 return {order,existing:false};
}
export function mockProviderEvent(data,orderId,event){
 const order=data.orders.find(o=>o.id===orderId&&o.mode==='TEST_ONLY'&&
    o.currency==='NPR'&&o.amount===ENTRY_FEE_NPR);
 if(!order)return {error:'invalid_test_order'};
 const next={
  pending:{succeeded:'paid',failed:'failed'},
  failed:{retry:'pending'},
  paid:{refund_requested:'refund_pending'},
  refund_pending:{refunded:'refunded',refund_rejected:'paid'}
 }[order.state]?.[event];
 if(!next){
  if((event==='succeeded'&&order.state==='paid')||(event==='refunded'&&order.state==='refunded'))
   return {order,unchanged:true};
  return {error:'invalid_payment_transition'};
 }
 if(event==='retry')order.attempt++;
 order.state=next;
 data.events.push({type:event,orderId:order.id});
 return {order,unchanged:false};
}
export function mockPaymentSummary(data){
 const orders=Array.isArray(data.orders)?data.orders.filter(o=>o.mode==='TEST_ONLY'&&o.amount===ENTRY_FEE_NPR&&o.currency==='NPR'):[];
 const count=state=>orders.filter(o=>o.state===state).length;
 return {orders:orders.length,pending:count('pending'),paid:count('paid'),
  failed:count('failed'),refundPending:count('refund_pending'),refunded:count('refunded'),
  grossNpr:orders.filter(o=>['paid','refund_pending','refunded'].includes(o.state)).length*ENTRY_FEE_NPR,
  refundedNpr:count('refunded')*ENTRY_FEE_NPR,
  netNpr:orders.filter(o=>['paid','refund_pending'].includes(o.state)).length*ENTRY_FEE_NPR};
}
