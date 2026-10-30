# Golden Himal Voice — Registration Fees and Cross-Border Payment Integration Plan
Last reviewed 2026-10-30. **Business / payment plan. NOT a live merchant connection.**

## Authoritative project source
Alan's 2026-10-28 Draft 1 (pending final approval by 王老師/Muse):
- Golden Himal Palace website receives Demo application and registration fee.
- 2027 March/June/September qualifying rounds; December final.
- NPR 500 per applicant **per qualifying-round application**. Re-entry after not qualifying requires a new application and fee; finalists are not charged another fee for December.
- Alan draft describes fee as non-refundable, but must confirm lawful terms, consumer disclosures, disputed payments, cancelled events and policy exceptions before displaying as definitive.
- Demo described as link + receipt by the structured Draft 1, Alan messages also ask for Demo files; resolve whether video file upload to private R2 is truly needed (and size/retention).

## CRITICAL unresolved merchant identity
A payment provider is licensed/contracted against **the legal entity that receives the money**, not the location of the remote website engineer.
1. Confirm merchant legal entity, registration country (Nepal, Singapore, Taiwan?), business registration, PAN/VAT/tax, bank account and payout currency.
2. Confirm whether entrants pay from Nepal mobile banking/wallet, international cards or both; fee NPR 500 needs exact payout/currency conversion handling.
3. Confirm which front-line staff is authorized for finance reconciliation, settlement, refunds and disputes; never paste provider credentials into the public GitHub repo.
4. Check payment-network and local tax/privacy requirements with local licensed business/bank advisor.

## Provider research from official sources
- Khalti by IME: https://docs.khalti.com/getting-started/ ; merchant KYC, sandbox and live key issued to eligible merchants. Khalti support FAQ states Nepal-registered company is needed; public docs indicate live limits until KYC/commercial approval.
- eSewa ePay: https://developer.esewa.com.np/pages/Epay ; hosted checkout, test account, merchant signature validation and transaction verification.
- Fonepay merchant / Checkout and dynamic QR: https://fonepay.com/faqs ; bank-led merchant enrollment and per-payment QR via supported partners.
- Nabil Bank EPG international cards: https://www.nabilbank.com/individual/services/nabil-electronic-payment-gateway-epg ; Visa, Mastercard/UnionPay issued in Nepal or abroad; eligibility and fees need bank quote.
- A Singapore Stripe merchant requires qualifying Singapore entity/tax ID/real bank and Stripe underwriting. See https://support.stripe.com/questions/requirements-to-open-a-stripe-account-in-another-country .

Avoid selecting a provider based solely on website domain, user citizenship or payment destination. Never promise a provider supports NPR conversion for a Singapore company until verified by it.

## Official happy-path design (not implemented yet)
1. Website form creates an application in a **separate authenticated STAGING D1**, generates a stable registration ID and fee order with server-side NPR 500.
2. Server starts a hosted checkout with chosen provider using signed/idempotent merchant credentials stored as Cloudflare Secrets.
3. Browser redirects; an arbitrary success page does **not** mark application paid.
4. Worker verifies cryptographic signature and performs server-to-server transaction lookup, checking provider reference, paid status, exact NPR amount, merchant, and known registration ID; idempotently writes the payment event and state.
5. Backoffice displays registered / unpaid / payment-pending / paid / failed / refund-pending / refunded / disputed; independent of screening review statuses. Reconciliation compares records to provider settlements and bank statements.
6. Eligible application proceeds to screening only after verified payment and Demo requirements (policy may permit correction/pending states; decide with organizers).
7. Refunds/disputes/cancellations are authorized through provider/bank operations, tracked in an immutable event trail; never mark a refund merely by clicking a front-end button.
8. Payments to/from separate countries require local legal/tax/regulatory check before enabling.

## Sandbox deliverables in this PR
- `/payment-lab.html`: clearly labelled mock-only NPR500 checkout/reconciliation.
- Each existing browser TEST registration gets one mock order. Duplicate creation returns the same order.
- Mock success, failed/retry, refund request/completion and idempotent duplicate provider callback all run locally in browser. No actual payment, D1 write or external API.
- `backend/migrations/0004_payment_architecture_DRAFT_ONLY.sql` describes schema for future **review**, but is NOT applied to Cloudflare.
- Unit and Chrome browser tests must pass before merge.

## Gates still outstanding
- Merchant legal entity, account number ownership, KYC and written payment fees confirmed by Alan/Muse.
- Provider sandbox test credentials supplied by merchant securely to Cloudflare Secrets (NEVER GitHub).
- Authenticated Worker payment initiator and webhook verifier; separate STAGING database; private R2 if applicable.
- Idempotent creation under concurrency, falsified/duplicated callback rejection, currency mismatch, amount mismatch, failed/expired refund and dispute tests.
- 20 synthetic HTTP registrations + true TEST merchant sandbox confirmations + D1 GET reconciliation and rollback/recovery; no real charges.
- Independent finance sign-off, Nepal legal/tax/consumer notice and refund rules, production KYC/contract, then small controlled real charge/refund only when authorized.

## Additional launch prerequisites beyond payment
Age >18 proof and student/community eligibility, consistent category across season; registration window gating; Demo upload/file scan & consent; real reviewer identities and role permissions; privacy/retention/consent/terms, bilingual/trilingual testing, reports & backups, OTP and voting provider decisions, abuse protection and production observability.

**Never mix browser mock payments with live accounting.**
