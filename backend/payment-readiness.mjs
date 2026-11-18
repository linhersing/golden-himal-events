/**
 * Golden Himal Voice — future payment policy, NOT a payment gateway.
 *
 * Source: 2026-11-16 internal contest rules, superseded for public display by
 * Muse/Alan's 2026-11-18 instruction. All fee values here are INTERNAL ONLY.
 *
 * This module is intentionally not imported into the public client or Worker
 * router. Until the organizer approves collection details, it must remain
 * disconnected and must not create real transactions or change eligibility.
 */
export const PAYMENT_STAGES = Object.freeze({
  audition: Object.freeze({ chargeNpr: 0, requiresPayment: false }),
  first_selection: Object.freeze({ chargeNpr: 0, requiresPayment: false }),
  second_selection: Object.freeze({ chargeNpr: 300, requiresPayment: true }),
  pk: Object.freeze({ chargeNpr: 500, requiresPayment: true })
});

export const PAYMENT_MODES = Object.freeze({
  OFF: 'off',
  MANUAL: 'manual',
  PROVIDER: 'provider'
});

export function quoteStage(stage, entrantCount = 1) {
  if (!Object.hasOwn(PAYMENT_STAGES, stage)) throw new RangeError('unknown_stage');
  if (!Number.isSafeInteger(entrantCount) || entrantCount < 1 || entrantCount > 1000) {
    throw new RangeError('invalid_entrant_count');
  }
  const { chargeNpr, requiresPayment } = PAYMENT_STAGES[stage];
  return Object.freeze({
    stage,
    entrantCount,
    currency: 'NPR',
    internalUnitNpr: chargeNpr,
    internalTotalNpr: chargeNpr * entrantCount,
    requiresPayment
  });
}

/**
 * Readiness decision only. Never returns "paid" and never invokes a provider.
 * The default mode is OFF even when the caller supplies a paid stage.
 */
export function paymentReadiness({
  stage,
  entrantCount = 1,
  mode = PAYMENT_MODES.OFF,
  organizerApproved = false,
  eligibleForStage = false,
  vendorApproved = false,
  refundPolicyApproved = false
} = {}) {
  const quote = quoteStage(stage, entrantCount);
  if (!quote.requiresPayment) {
    return Object.freeze({ decision: 'not_required', quote, mayRequestMoney: false });
  }
  if (!Object.values(PAYMENT_MODES).includes(mode)) throw new RangeError('unknown_payment_mode');
  if (mode === PAYMENT_MODES.OFF || !organizerApproved || !eligibleForStage || !refundPolicyApproved) {
    return Object.freeze({ decision: 'on_hold', quote, mayRequestMoney: false });
  }
  if (mode === PAYMENT_MODES.PROVIDER && !vendorApproved) {
    return Object.freeze({ decision: 'vendor_approval_missing', quote, mayRequestMoney: false });
  }
  return Object.freeze({
    decision: mode === PAYMENT_MODES.MANUAL ? 'manual_review_design_ready' : 'provider_design_ready',
    quote,
    // A design-ready state does not authorize collection or mark a bill paid.
    mayRequestMoney: false
  });
}

export function settlementDecision({
  providerResponse,
  verifiedServerSide = false,
  expectedTransactionId,
  expectedAmountNpr,
  expectedCurrency = 'NPR'
} = {}) {
  // Defensive default: a QR photo, client redirect, screenshot or URL query
  // parameter is not verification of a completed transaction.
  if (!verifiedServerSide) return 'unverified';
  if (!providerResponse || typeof providerResponse !== 'object') return 'unverified';
  if (!expectedTransactionId || providerResponse.transactionId !== expectedTransactionId) return 'mismatch';
  if (providerResponse.currency !== expectedCurrency) return 'mismatch';
  if (!Number.isSafeInteger(expectedAmountNpr) || expectedAmountNpr < 1) return 'mismatch';
  if (providerResponse.amountNpr !== expectedAmountNpr) return 'mismatch';
  return providerResponse.status === 'completed' ? 'verified_completed' : 'not_completed';
}
