import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';
import {demoFeeQuote,DEMO_FEE_NPR} from '../public/demo-fee.mjs';
import {ENTRY_FEE_NPR,emptyPayments,newMockOrder,mockPaymentSummary} from '../public/payment-lab-model.mjs';

test('NPR 300 per Demo is consistent with 1, 5 and 10 Demo quotes',()=>{
 assert.equal(DEMO_FEE_NPR,300);
 assert.equal(ENTRY_FEE_NPR,300);
 assert.equal(demoFeeQuote(1).totalNpr,300);
 assert.equal(demoFeeQuote(5).totalNpr,1500);
 assert.equal(demoFeeQuote(10).totalNpr,3000);
});

test('previous TEST order amount is retained, new orders use 300 and totals use each order face amount',()=>{
 const s=emptyPayments();
 s.orders.push({id:'PAY-TEST-0001',registrationId:'GHV-TEST-0001',person:'T001',round:'2027-03',amount:500,currency:'NPR',state:'paid',attempt:1,mode:'TEST_ONLY'});
 s.sequence=2;
 const created=newMockOrder(s,{id:'GHV-TEST-0002',person:'T002',round:'2027-03'});
 assert.equal(created.order.amount,300);
 created.order.state='paid';
 assert.equal(mockPaymentSummary(s).grossNpr,800);
 assert.equal(mockPaymentSummary(s).netNpr,800);
});

test('D1 TEST-only fee migration preserves historic 50000 paisa and accepts new 30000',async()=>{
 const db=new DatabaseSync(':memory:');
 try{
  db.exec(`PRAGMA foreign_keys=ON;
   CREATE TABLE e2e_applications(id TEXT PRIMARY KEY);
   INSERT INTO e2e_applications VALUES('APP-OLD'),('APP-NEW');
   CREATE TABLE e2e_payment_events (
    id TEXT PRIMARY KEY,
    application_id TEXT NOT NULL UNIQUE REFERENCES e2e_applications(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK(event_type='SIMULATED_PAYMENT'),
    amount_paisa INTEGER NOT NULL DEFAULT 50000 CHECK(amount_paisa=50000),
    created_at INTEGER NOT NULL
   );
   INSERT INTO e2e_payment_events VALUES('old','APP-OLD','SIMULATED_PAYMENT',50000,1);`);
  const sql=await readFile(new URL('../backend/migrations/1010_staging_fee_npr300_ONLY.sql',import.meta.url),'utf8');
  db.exec(sql);
  assert.equal(db.prepare("SELECT amount_paisa FROM e2e_payment_events WHERE id='old'").get().amount_paisa,50000);
  db.exec("INSERT INTO e2e_payment_events(id,application_id,event_type,created_at) VALUES('new','APP-NEW','SIMULATED_PAYMENT',2)");
  assert.equal(db.prepare("SELECT amount_paisa FROM e2e_payment_events WHERE id='new'").get().amount_paisa,30000);
  assert.throws(()=>db.exec("UPDATE e2e_payment_events SET amount_paisa=20000 WHERE id='new'"));
  db.exec(sql);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM e2e_payment_events').get().count,2);
 }finally{db.close()}
});
