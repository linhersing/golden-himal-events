import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PERSONAS,ROUNDS,blankPortal,safeParsePortal,signUpMock,applyMock,
 getOrCreateOrder,simulatePayment,reviewMock,seed20,summary,FEE_NPR} from '../public/member-portal-model.mjs';
test('create synthetic member with fake verified email and preserve account identity',()=>{
 const s=blankPortal();
 const x=signUpMock(s,'T001');
 assert.equal(x.member.id,'MEM-TEST-0001');
 assert.equal(x.member.email,'singer-001@example.invalid');
 assert.equal(x.member.emailVerified,'MOCK_ONLY');
 assert.equal(signUpMock(s,'T001').error.includes('已有'),true);
 assert.equal(signUpMock(s,'REAL').error.includes('固定'),true);
 assert.equal(s.members.length,1);
});
test('underage synthetic member is rejected before enrollment',()=>{
 const s=blankPortal();
 assert.equal(PERSONAS[19].age,17);
 assert.match(signUpMock(s,'T020').error,/未滿18歲/);
 assert.equal(s.members.length,0);
});
test('pay 500 per application, cannot pay twice or shortlist before payment',()=>{
 const s=blankPortal();
 const m=signUpMock(s,'T001').member;
 const app=applyMock(s,m.id,'2027-03','TEST-DEMO-60S').application;
 assert.equal(app.category,'university');
 assert.equal(reviewMock(s,app.id,'shortlisted').error.includes('付款'),true);
 const p=getOrCreateOrder(s,app.id);
 assert.equal(p.order.amountNpr,500);
 assert.equal(getOrCreateOrder(s,app.id).existing,true);
 assert.equal(s.orders.length,1);
 assert.equal(simulatePayment(s,p.order.id,'success').order.status,'paid');
 assert.equal(simulatePayment(s,p.order.id,'success').duplicate,true);
 assert.equal(reviewMock(s,app.id,'shortlisted').application.status,'shortlisted');
 assert.equal(summary(s).testNetNpr,FEE_NPR);
 assert.equal(summary(s).grossTestNpr,FEE_NPR);
});
test('different 2027 qualifier rounds generate distinct fees, one per round',()=>{
 const s=blankPortal(),m=signUpMock(s,'T002').member;
 const a=applyMock(s,m.id,'2027-03','TEST-DEMO-60S').application;
 assert.ok(applyMock(s,m.id,'2027-03','TEST-DEMO-90S').error);
 const b=applyMock(s,m.id,'2027-06','TEST-DEMO-90S').application;
 const pa=getOrCreateOrder(s,a.id).order,pb=getOrCreateOrder(s,b.id).order;
 assert.notEqual(pa.id,pb.id);
 simulatePayment(s,pa.id,'success');simulatePayment(s,pb.id,'success');
 assert.equal(summary(s).testNetNpr,1000);
 assert.equal(applyMock(s,m.id,'2027-12','TEST-DEMO-60S').error.includes('場次無效'),true);
 assert.deepEqual(ROUNDS,['2027-03','2027-06','2027-09']);
});
test('finalist cannot register for another qualifying round',()=>{
 const s=blankPortal(),m=signUpMock(s,'T003').member;
 const a=applyMock(s,m.id,'2027-03','TEST-DEMO-60S').application;
 const o=getOrCreateOrder(s,a.id).order;
 simulatePayment(s,o.id,'success');
 assert.ok(reviewMock(s,a.id,'finalist').error);
 reviewMock(s,a.id,'shortlisted');reviewMock(s,a.id,'finalist');
 assert.match(applyMock(s,m.id,'2027-06','TEST-DEMO-60S').error,/已晉級/);
});
test('failed payment requires simulated retry before success, refund zeroes net',()=>{
 const s=blankPortal(),m=signUpMock(s,'T004').member;
 const a=applyMock(s,m.id,'2027-03','TEST-DEMO-60S').application;
 const o=getOrCreateOrder(s,a.id).order;
 assert.equal(simulatePayment(s,o.id,'fail').order.status,'failed');
 assert.ok(simulatePayment(s,o.id,'success').error);
 assert.equal(simulatePayment(s,o.id,'retry').order.status,'unpaid');
 simulatePayment(s,o.id,'success');simulatePayment(s,o.id,'request_refund');
 assert.equal(summary(s).testNetNpr,500);
 simulatePayment(s,o.id,'refund_complete');
 assert.equal(summary(s).testNetNpr,0);
 assert.equal(summary(s).grossTestNpr,500);
 assert.equal(simulatePayment(s,o.id,'refund_complete').duplicate,true);
});
test('20 synthetic cases intentionally include one 17-year-old rejection',()=>{
 const s=blankPortal(),result=seed20(s);
 assert.equal(result.length,20);
 assert.equal(result.filter(x=>x.error).length,1);
 assert.equal(s.members.length,19);
 assert.equal(s.applications.length,19);
 assert.equal(s.orders.length,19);
 assert.equal(summary(s).paidOrders,7);
 assert.equal(summary(s).shortlist,7);
 assert.equal(summary(s).testNetNpr,3500);
 assert.ok(s.members.every(x=>x.email.endsWith('@example.invalid')));
});
test('local storage parser rejects tampered fake payment, real address, invalid workflow',()=>{
 const s=blankPortal(),m=signUpMock(s,'T001').member;
 const a=applyMock(s,m.id,'2027-03','TEST-DEMO-60S').application;
 const o=getOrCreateOrder(s,a.id).order;
 simulatePayment(s,o.id,'success');reviewMock(s,a.id,'shortlisted');
 assert.equal(safeParsePortal(JSON.stringify(s)).applications.length,1);
 const compromised=structuredClone(s);
 compromised.members[0].email='private@example.com';
 assert.equal(safeParsePortal(JSON.stringify(compromised)).members.length,0);
 compromised.members[0].email='singer-001@example.invalid';
 compromised.orders[0].amountNpr=1;
 assert.equal(safeParsePortal(JSON.stringify(compromised)).members.length,0);
 const invalid=structuredClone(s);invalid.applications[0].category='community';
 assert.equal(safeParsePortal(JSON.stringify(invalid)).members.length,0);
 assert.equal(safeParsePortal('broken').members.length,0);
});
test('member portal never collects real account credentials or triggers financial API',async()=>{
 const html=await readFile(new URL('../public/member-portal.html',import.meta.url),'utf8');
 const script=await readFile(new URL('../public/member-portal.js',import.meta.url),'utf8');
 for(const id of ['panel-enroll','panel-apply','panel-checkout','panel-profile',
  'panel-operator','panel-audit','seed20','payment-feedback']) assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/TEST ONLY/);
 assert.match(html,/沒有真實帳號/);
 assert.match(html,/不收取任何費用/);
 assert.doesNotMatch(html,/<input\b[^>]*type=['"]?(password|email|file|tel|number)/i);
 assert.doesNotMatch(script,/fetch\s*\(/);
 assert.doesNotMatch(script,/\.post\s*\(/);
});

test('401+ fake reviews never cause local member/application/payment loss on reload',()=>{
 const state=blankPortal();
 const member=signUpMock(state,'T001').member;
 const app=applyMock(state,member.id,'2027-03','TEST-DEMO-60S').application;
 const order=getOrCreateOrder(state,app.id).order;
 simulatePayment(state,order.id,'success');
 for(let i=0;i<460;i++){
  const next=i%2?'shortlisted':'needs_info';
  assert.ok(reviewMock(state,app.id,next).application);
 }
 assert.ok(state.audit.length<=200,'audit must be bounded during mutation');
 const restored=safeParsePortal(JSON.stringify(state));
 assert.equal(restored.members.length,1);
 assert.equal(restored.applications.length,1);
 assert.equal(restored.orders.length,1);
 assert.equal(restored.orders[0].status,'paid');
 assert.ok(restored.audit.length<=200);
});
test('old valid localStorage with >400 audit messages migrates without erasing members',()=>{
 const state=blankPortal();
 const member=signUpMock(state,'T002').member;
 const app=applyMock(state,member.id,'2027-06','TEST-DEMO-90S').application;
 getOrCreateOrder(state,app.id);
 state.audit=Array.from({length:430},(_,i)=>({event:'fake_legacy_review',ref:'APP-TEST-0001'}));
 const upgraded=safeParsePortal(JSON.stringify(state));
 assert.equal(upgraded.members.length,1);
 assert.equal(upgraded.applications.length,1);
 assert.equal(upgraded.orders.length,1);
 assert.equal(upgraded.audit.length,200);
});
