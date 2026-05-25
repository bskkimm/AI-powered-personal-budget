import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type Database from "better-sqlite3";
import { createTestDb } from "@ai-budget/db";
import {
  insertCanonicalTransaction,
  updateSyncStatus,
  getCanonicalTransactionById,
} from "@ai-budget/db";
import { insertRawEvent } from "@ai-budget/db";
import type { CanonicalTransaction, RawEvent } from "@ai-budget/core";

describe("canonical transactions repository", () => {
  let db: Database.Database;

  const makeRawEvent = (overrides: Partial<RawEvent> = {}): RawEvent => ({
    raw_event_id: "evt_001",
    source_channel: "phone_notification",
    source_name: "paypay",
    sender_or_app: null,
    title: null,
    body: "default body",
    received_at: "2026-05-24T20:15:00+09:00",
    external_source_id: null,
    processed_status: "pending",
    error_message: null,
    created_at: "2026-05-24T20:15:00+09:00",
    ...overrides,
  });

  beforeEach(() => {
    db = createTestDb();
  });

  afterEach(() => {
    db.close();
  });

  const makeTx = (
    overrides: Partial<CanonicalTransaction> = {},
  ): CanonicalTransaction => ({
    transaction_id: "tx_001",
    raw_event_id: "evt_001",
    datetime: "2026-05-24T20:15:00+09:00",
    date: "2026-05-24",
    month: "2026-05",
    country: "JP",
    amount_value: 680,
    currency: "JPY",
    display_amount: "¥680",
    merchant: "FamilyMart",
    payment_platform: "PayPay",
    payment_method: "PayPay",
    transaction_type: "expense",
    category: "Convenience Store",
    subcategory: null,
    actual_account_id: "acc_paypay",
    actual_account_name: "PayPay",
    actual_category_id: "cat_convenience",
    actual_category_name: "Convenience Store",
    source_channel: "phone_notification",
    source_name: "paypay",
    auto_or_manual: "auto",
    needs_review: false,
    confidence_score: 0.95,
    memo: null,
    raw_text: null,
    duplicate_status: "unique",
    actual_sync_status: "not_synced",
    actual_transaction_id: null,
    created_at: "2026-05-24T20:15:00+09:00",
    updated_at: "2026-05-24T20:15:00+09:00",
    ...overrides,
  });

  it("should insert and retrieve a canonical transaction", () => {
    insertRawEvent(db, makeRawEvent());
    const tx = makeTx();
    insertCanonicalTransaction(db, tx);

    const found = getCanonicalTransactionById(db, "tx_001");
    expect(found).not.toBeNull();
    expect(found!.transaction_id).toBe("tx_001");
    expect(found!.amount_value).toBe(680);
    expect(found!.currency).toBe("JPY");
    expect(found!.merchant).toBe("FamilyMart");
  });

  it("should handle null fields correctly", () => {
    insertRawEvent(db, makeRawEvent());
    const tx = makeTx({
      transaction_id: "tx_002",
      merchant: null,
      category: null,
      country: null,
      actual_account_id: null,
    });
    insertCanonicalTransaction(db, tx);

    const found = getCanonicalTransactionById(db, "tx_002");
    expect(found).not.toBeNull();
    expect(found!.merchant).toBeNull();
    expect(found!.category).toBeNull();
    expect(found!.country).toBeNull();
  });

  it("should store needs_review as integer", () => {
    insertRawEvent(db, makeRawEvent());
    const tx = makeTx({ transaction_id: "tx_review", needs_review: true });
    insertCanonicalTransaction(db, tx);

    const found = getCanonicalTransactionById(db, "tx_review");
    expect(found!.needs_review).toBe(true);
  });

  it("should return null for unknown transaction id", () => {
    const found = getCanonicalTransactionById(db, "nonexistent");
    expect(found).toBeNull();
  });

  it("should update sync status to synced and log it", () => {
    insertRawEvent(db, makeRawEvent());
    const tx = makeTx();
    insertCanonicalTransaction(db, tx);
    updateSyncStatus(db, "tx_001", "synced", "actual_tx_123");

    const found = getCanonicalTransactionById(db, "tx_001");
    expect(found!.actual_sync_status).toBe("synced");
    expect(found!.actual_transaction_id).toBe("actual_tx_123");

    const log = db
      .prepare("SELECT * FROM actual_sync_log WHERE transaction_id = ?")
      .get("tx_001") as Record<string, unknown> | undefined;
    expect(log).not.toBeNull();
    expect(log!.status).toBe("synced");
    expect(log!.actual_transaction_id).toBe("actual_tx_123");
  });

  it("should update sync status to sync_failed with error", () => {
    insertRawEvent(db, makeRawEvent());
    const tx = makeTx();
    insertCanonicalTransaction(db, tx);
    updateSyncStatus(db, "tx_001", "sync_failed", null, "Connection refused");

    const found = getCanonicalTransactionById(db, "tx_001");
    expect(found!.actual_sync_status).toBe("sync_failed");

    const log = db
      .prepare("SELECT * FROM actual_sync_log WHERE transaction_id = ?")
      .get("tx_001") as Record<string, unknown> | undefined;
    expect(log!.status).toBe("sync_failed");
    expect(log!.error_message).toBe("Connection refused");
  });

  it("should reject insert with missing raw_event_id foreign key", () => {
    const tx = makeTx({ raw_event_id: "nonexistent" });
    expect(() => insertCanonicalTransaction(db, tx)).toThrow();
  });
});
