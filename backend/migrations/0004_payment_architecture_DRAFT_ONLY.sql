-- Golden Himal Voice: FUTURE ARCHITECTURE ONLY, NEVER MIGRATE TO LIVE WITHOUT REVIEW.
-- Depends on 0003_season_registrations.sql. No actual gateway credentials or real payments.
-- NPR 500 = 50,000 paisa; server must calculate this, NEVER accept amount from browser.
-- Actual gateway may use different amount units: adapter must convert and verify.
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS payment_orders (
  id TEXT PRIMARY KEY,
  registration_id TEXT NOT NULL UNIQUE REFERENCES registrations(id),
  currency TEXT NOT NULL DEFAULT 'NPR' CHECK(currency='NPR'),
  amount_paisa INTEGER NOT NULL CHECK(amount_paisa=50000),
  merchant_country TEXT NOT NULL CHECK(merchant_country IN ('NP','SG','OTHER')),
  payment_provider TEXT NOT NULL CHECK(payment_provider IN ('khalti','esewa','fonepay','bank_card','manual')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','paid','failed','cancelled','refund_pending','refunded','chargeback')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  verified_at INTEGER,
  CHECK(updated_at>=created_at)
);
CREATE INDEX IF NOT EXISTS idx_payment_orders_state ON payment_orders(status,created_at);
CREATE TABLE IF NOT EXISTS payment_attempts (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES payment_orders(id),
  provider_reference TEXT,
  provider_transaction_id TEXT,
  amount_paisa INTEGER NOT NULL CHECK(amount_paisa=50000),
  currency TEXT NOT NULL DEFAULT 'NPR' CHECK(currency='NPR'),
  state TEXT NOT NULL CHECK(state IN ('initiated','pending','success','failed','expired')),
  created_at INTEGER NOT NULL,
  verified_at INTEGER,
  UNIQUE(provider_transaction_id),
  UNIQUE(provider_reference)
);
CREATE TABLE IF NOT EXISTS payment_events (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES payment_orders(id),
  provider TEXT NOT NULL,
  provider_event_id TEXT,
  event_type TEXT NOT NULL,
  source TEXT NOT NULL CHECK(source IN ('verified_provider','trusted_operator')),
  created_at INTEGER NOT NULL,
  UNIQUE(provider,provider_event_id)
);
CREATE TABLE IF NOT EXISTS payment_refunds (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES payment_orders(id),
  refund_reference TEXT UNIQUE,
  amount_paisa INTEGER NOT NULL CHECK(amount_paisa>0 AND amount_paisa<=50000),
  status TEXT NOT NULL CHECK(status IN ('requested','approved','processing','completed','rejected')),
  reason_code TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
-- TODO security before deployment:
--   All paid/refunded status changes must be server-authorized after signed
--   callback verification + independent provider lookup and full amount check.
--   Use D1 transactions, idempotency and reconciliation for concurrent callbacks.
--   Never put PII, screenshots, card details or signing secrets in these tables.
--   Configure separate production and staging databases, retention, access audit.
