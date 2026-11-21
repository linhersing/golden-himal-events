import test from 'node:test';
import assert from 'node:assert/strict';
import {
 PAYMENT_MODES, quoteStage, paymentReadiness, settlementDecision
} from '../backend/payment-readiness.mjs';

test('first two stages are free independent of participant count', () => {
 for(const stage of ['audition', 'first_selection']) {
  const result = paymentReadiness({ stage, entrantCount: 5 });
  assert.equal(result.decision, 'not_required');
  assert.equal(result.quote.internalTotalNpr, 0);
  assert.equal(result.mayRequestMoney, false);
 }
});
test('internal fee reference follows 2026-11-16 rules without publishing it', () => {
 assert.equal(quoteStage('second_selection', 2).internalTotalNpr, 600);
 assert.equal(quoteStage('pk', 3).internalTotalNpr, 1500);
 assert.throws(() => quoteStage('audition', 0), /invalid_entrant_count/);
 assert.throws(() => quoteStage('unknown'), /unknown_stage/);
});
test('payment feature remains off even with approval and vendor configured', () => {
 const d = paymentReadiness({
  stage: 'pk', organizerApproved: true, eligibleForStage: true,
  refundPolicyApproved: true, vendorApproved: true
 });
 assert.equal(d.decision, 'on_hold');
 assert.equal(d.mayRequestMoney, false);
});
test('manual and provider designs cannot be enabled without explicit approvals', () => {
 const incomplete = paymentReadiness({stage:'pk',mode:PAYMENT_MODES.MANUAL,organizerApproved:true});
 assert.equal(incomplete.decision,'on_hold');
 const vendorMissing = paymentReadiness({
  stage:'pk',mode:PAYMENT_MODES.PROVIDER,
  organizerApproved:true,eligibleForStage:true,refundPolicyApproved:true
 });
 assert.equal(vendorMissing.decision,'vendor_approval_missing');
 const ready = paymentReadiness({
  stage:'pk',mode:PAYMENT_MODES.PROVIDER,
  organizerApproved:true,eligibleForStage:true,refundPolicyApproved:true,vendorApproved:true
 });
 assert.equal(ready.decision,'provider_design_ready');
 assert.equal(ready.mayRequestMoney,false);
});
test('client redirect or payment screenshot never proves settlement', () => {
 const evidence={status:'completed',transactionId:'test-1',currency:'NPR',amountNpr:300};
 assert.equal(settlementDecision({providerResponse:evidence,expectedTransactionId:'test-1',expectedAmountNpr:300}),'unverified');
 assert.equal(settlementDecision({providerResponse:evidence,verifiedServerSide:true,expectedTransactionId:'different',expectedAmountNpr:300}),'mismatch');
 assert.equal(settlementDecision({providerResponse:evidence,verifiedServerSide:true,expectedTransactionId:'test-1',expectedAmountNpr:500}),'mismatch');
 assert.equal(settlementDecision({providerResponse:evidence,verifiedServerSide:true,expectedTransactionId:'test-1',expectedAmountNpr:300}),'verified_completed');
});
