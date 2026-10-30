import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {emptyPayments,ENTRY_FEE_NPR,newMockOrder,mockProviderEvent,mockPaymentSummary} from '../public/payment-lab-model.mjs';
const reg=(id='GHV-TEST-0001',round='2027-03')=>({id,person:'T001',round});
test('NPR 500 fixed from server design, one mock payment order per registration',()=>{
 const s=emptyPayments();
 assert.equal(ENTRY_FEE_NPR,500);
 const a=newMockOrder(s,reg());
 assert.equal(a.order.amount,500);
 assert.equal(a.order.currency,'NPR');
 assert.equal(a.order.state,'pending');
 assert.equal(newMockOrder(s,reg()).existing,true);
 assert.equal(s.orders.length,1);
 assert.equal(newMockOrder(s,{...reg(),person:'REAL-PERSON'}).error,'invalid_test_registration');
 assert.equal(newMockOrder(s,{...reg(),round:'2027-12'}).error,'invalid_test_registration');
});
test('paid callback is idempotent, duplicate cannot double charge simulated NPR',()=>{
 const s=emptyPayments();const id=newMockOrder(s,reg()).order.id;
 assert.equal(mockProviderEvent(s,id,'succeeded').order.state,'paid');
 const second=mockProviderEvent(s,id,'succeeded');
 assert.equal(second.unchanged,true);
 assert.equal(mockPaymentSummary(s).grossNpr,500);
 assert.equal(mockPaymentSummary(s).netNpr,500);
 assert.equal(s.events.filter(x=>x.type==='succeeded').length,1);
 assert.equal(mockProviderEvent(s,id,'failed').error,'invalid_payment_transition');
});
test('failure retry, refund pending, refund approved and repeated refund notifications',()=>{
 const s=emptyPayments();const id=newMockOrder(s,reg()).order.id;
 assert.equal(mockProviderEvent(s,id,'failed').order.state,'failed');
 assert.equal(mockProviderEvent(s,id,'retry').order.attempt,2);
 assert.equal(mockProviderEvent(s,id,'succeeded').order.state,'paid');
 assert.equal(mockProviderEvent(s,id,'refund_requested').order.state,'refund_pending');
 assert.equal(mockPaymentSummary(s).netNpr,500);
 assert.equal(mockProviderEvent(s,id,'refunded').order.state,'refunded');
 assert.equal(mockProviderEvent(s,id,'refunded').unchanged,true);
 assert.equal(mockPaymentSummary(s).netNpr,0);
 assert.equal(mockPaymentSummary(s).refundedNpr,500);
});
test('two rounds are charged independently, zero actual payment providers',()=>{
 const s=emptyPayments();
 const a=newMockOrder(s,reg()).order;
 const b=newMockOrder(s,reg('GHV-TEST-0002','2027-06')).order;
 mockProviderEvent(s,a.id,'succeeded');mockProviderEvent(s,b.id,'succeeded');
 assert.deepEqual(mockPaymentSummary(s),{
  orders:2,pending:0,paid:2,failed:0,refundPending:0,refunded:0,
  grossNpr:1000,refundedNpr:0,netNpr:1000});
 assert.ok(a.id!==b.id);
});
test('payment page is visibly TEST ONLY, has no actual bank post nor card fields',async()=>{
 const html=await readFile(new URL('../public/payment-lab.html',import.meta.url),'utf8');
 const script=await readFile(new URL('../public/payment-lab.js',import.meta.url),'utf8');
 const homepage=await readFile(new URL('../public/test-lab.html',import.meta.url),'utf8');
 assert.match(html,/不扣真錢/);
 assert.match(html,/NPR 500/);
 assert.match(html,/不連銀行/);
 assert.match(homepage,/payment-lab.html/);
 assert.doesNotMatch(html,/<input[^>]*type=["']?(?:card|file|password)/i);
 assert.doesNotMatch(script,/fetch\s*\(/);
 assert.doesNotMatch(script,/https?:\/\//);
});
