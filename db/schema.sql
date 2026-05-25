CREATE TABLE IF NOT EXISTS raw_events (
  raw_event_id TEXT PRIMARY KEY,
  source_channel TEXT NOT NULL,
  source_name TEXT,
  sender_or_app TEXT,
  title TEXT,
  body TEXT NOT NULL,
  received_at TEXT NOT NULL,
  external_source_id TEXT,
  processed_status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS canonical_transactions (
  transaction_id TEXT PRIMARY KEY,
  raw_event_id TEXT NOT NULL REFERENCES raw_events(raw_event_id),
  datetime TEXT,
  date TEXT,
  month TEXT,
  country TEXT,
  amount_value REAL,
  currency TEXT,
  display_amount TEXT,
  merchant TEXT,
  payment_platform TEXT,
  payment_method TEXT,
  transaction_type TEXT,
  category TEXT,
  subcategory TEXT,
  actual_account_id TEXT,
  actual_account_name TEXT,
  actual_category_id TEXT,
  actual_category_name TEXT,
  source_channel TEXT NOT NULL,
  source_name TEXT,
  auto_or_manual TEXT NOT NULL,
  needs_review INTEGER NOT NULL DEFAULT 0,
  confidence_score REAL NOT NULL,
  memo TEXT,
  raw_text TEXT,
  duplicate_status TEXT NOT NULL,
  actual_sync_status TEXT NOT NULL,
  actual_transaction_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS actual_sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id TEXT NOT NULL REFERENCES canonical_transactions(transaction_id),
  actual_transaction_id TEXT,
  status TEXT NOT NULL,
  error_message TEXT,
  synced_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS account_mappings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_name TEXT,
  payment_platform TEXT,
  payment_method TEXT,
  actual_account_id TEXT NOT NULL,
  actual_account_name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS category_mappings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  merchant TEXT,
  category TEXT NOT NULL,
  subcategory TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS review_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id TEXT NOT NULL REFERENCES canonical_transactions(transaction_id),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_raw_events_status ON raw_events(processed_status);
CREATE INDEX IF NOT EXISTS idx_raw_events_source ON raw_events(external_source_id);
CREATE INDEX IF NOT EXISTS idx_canonical_tx_raw_event ON canonical_transactions(raw_event_id);
CREATE INDEX IF NOT EXISTS idx_canonical_tx_sync ON canonical_transactions(actual_sync_status);
CREATE INDEX IF NOT EXISTS idx_sync_log_tx ON actual_sync_log(transaction_id);
