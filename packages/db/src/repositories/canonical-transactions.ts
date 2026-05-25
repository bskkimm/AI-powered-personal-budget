import type Database from "better-sqlite3";
import type {
  CanonicalTransaction,
  ActualSyncStatus,
} from "@ai-budget/core";

interface CanonicalTxRow {
  transaction_id: string;
  raw_event_id: string;
  datetime: string | null;
  date: string | null;
  month: string | null;
  country: string | null;
  amount_value: number | null;
  currency: string | null;
  display_amount: string | null;
  merchant: string | null;
  payment_platform: string | null;
  payment_method: string | null;
  transaction_type: string | null;
  category: string | null;
  subcategory: string | null;
  actual_account_id: string | null;
  actual_account_name: string | null;
  actual_category_id: string | null;
  actual_category_name: string | null;
  source_channel: string;
  source_name: string | null;
  auto_or_manual: string;
  needs_review: number;
  confidence_score: number;
  memo: string | null;
  raw_text: string | null;
  duplicate_status: string;
  actual_sync_status: string;
  actual_transaction_id: string | null;
  created_at: string;
  updated_at: string;
}

function rowToCanonicalTransaction(
  row: CanonicalTxRow,
): CanonicalTransaction {
  return {
    transaction_id: row.transaction_id,
    raw_event_id: row.raw_event_id,
    datetime: row.datetime,
    date: row.date,
    month: row.month,
    country: row.country,
    amount_value: row.amount_value,
    currency: row.currency,
    display_amount: row.display_amount,
    merchant: row.merchant,
    payment_platform: row.payment_platform,
    payment_method: row.payment_method,
    transaction_type: row.transaction_type as CanonicalTransaction["transaction_type"],
    category: row.category,
    subcategory: row.subcategory,
    actual_account_id: row.actual_account_id,
    actual_account_name: row.actual_account_name,
    actual_category_id: row.actual_category_id,
    actual_category_name: row.actual_category_name,
    source_channel: row.source_channel as CanonicalTransaction["source_channel"],
    source_name: row.source_name,
    auto_or_manual: row.auto_or_manual as "auto" | "manual",
    needs_review: row.needs_review === 1,
    confidence_score: row.confidence_score,
    memo: row.memo,
    raw_text: row.raw_text,
    duplicate_status: row.duplicate_status as CanonicalTransaction["duplicate_status"],
    actual_sync_status: row.actual_sync_status as ActualSyncStatus,
    actual_transaction_id: row.actual_transaction_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function insertCanonicalTransaction(
  db: Database.Database,
  tx: CanonicalTransaction,
): void {
  db.prepare(
    `INSERT INTO canonical_transactions (
      transaction_id, raw_event_id, datetime, date, month, country,
      amount_value, currency, display_amount, merchant, payment_platform,
      payment_method, transaction_type, category, subcategory,
      actual_account_id, actual_account_name, actual_category_id,
      actual_category_name, source_channel, source_name, auto_or_manual,
      needs_review, confidence_score, memo, raw_text, duplicate_status,
      actual_sync_status, actual_transaction_id, created_at, updated_at
    ) VALUES (
      @transaction_id, @raw_event_id, @datetime, @date, @month, @country,
      @amount_value, @currency, @display_amount, @merchant, @payment_platform,
      @payment_method, @transaction_type, @category, @subcategory,
      @actual_account_id, @actual_account_name, @actual_category_id,
      @actual_category_name, @source_channel, @source_name, @auto_or_manual,
      @needs_review, @confidence_score, @memo, @raw_text, @duplicate_status,
      @actual_sync_status, @actual_transaction_id, @created_at, @updated_at
    )`,
  ).run({
    transaction_id: tx.transaction_id,
    raw_event_id: tx.raw_event_id,
    datetime: tx.datetime,
    date: tx.date,
    month: tx.month,
    country: tx.country,
    amount_value: tx.amount_value,
    currency: tx.currency,
    display_amount: tx.display_amount,
    merchant: tx.merchant,
    payment_platform: tx.payment_platform,
    payment_method: tx.payment_method,
    transaction_type: tx.transaction_type,
    category: tx.category,
    subcategory: tx.subcategory,
    actual_account_id: tx.actual_account_id,
    actual_account_name: tx.actual_account_name,
    actual_category_id: tx.actual_category_id,
    actual_category_name: tx.actual_category_name,
    source_channel: tx.source_channel,
    source_name: tx.source_name,
    auto_or_manual: tx.auto_or_manual,
    needs_review: tx.needs_review ? 1 : 0,
    confidence_score: tx.confidence_score,
    memo: tx.memo,
    raw_text: tx.raw_text,
    duplicate_status: tx.duplicate_status,
    actual_sync_status: tx.actual_sync_status,
    actual_transaction_id: tx.actual_transaction_id,
    created_at: tx.created_at,
    updated_at: tx.updated_at,
  });
}

export function updateSyncStatus(
  db: Database.Database,
  transactionId: string,
  status: ActualSyncStatus,
  actualTransactionId?: string | null,
  errorMessage?: string | null,
): void {
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE canonical_transactions
     SET actual_sync_status = @status,
         actual_transaction_id = COALESCE(@actual_transaction_id, actual_transaction_id),
         updated_at = @now
     WHERE transaction_id = @transaction_id`,
  ).run({
    transaction_id: transactionId,
    status,
    actual_transaction_id: actualTransactionId ?? null,
    now,
  });

  db.prepare(
    `INSERT INTO actual_sync_log (
      transaction_id, actual_transaction_id, status, error_message, synced_at, created_at
    ) VALUES (
      @transaction_id, @actual_transaction_id, @status, @error_message, @synced_at, @created_at
    )`,
  ).run({
    transaction_id: transactionId,
    actual_transaction_id: actualTransactionId ?? null,
    status,
    error_message: errorMessage ?? null,
    synced_at: status === "synced" ? now : null,
    created_at: now,
  });
}

export function getCanonicalTransactionById(
  db: Database.Database,
  id: string,
): CanonicalTransaction | null {
  const row = db
    .prepare("SELECT * FROM canonical_transactions WHERE transaction_id = ?")
    .get(id) as CanonicalTxRow | undefined;
  return row ? rowToCanonicalTransaction(row) : null;
}
