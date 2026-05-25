import { describe, it, expect } from "vitest";
import { detectDuplicates } from "@ai-budget/core";
import type { CanonicalTransaction, RawEvent } from "@ai-budget/core";

function makeTx(overrides: Partial<CanonicalTransaction> = {}): CanonicalTransaction {
  return {
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
  };
}

function makeEvent(overrides: Partial<RawEvent> = {}): RawEvent {
  return {
    raw_event_id: "evt_001",
    source_channel: "phone_notification",
    source_name: "paypay",
    sender_or_app: null,
    title: null,
    body: "test",
    received_at: "2026-05-24T20:15:00+09:00",
    external_source_id: null,
    processed_status: "pending",
    error_message: null,
    created_at: "2026-05-24T20:15:00+09:00",
    ...overrides,
  };
}

describe("detectDuplicates", () => {
  it("should return unique when no existing transactions", () => {
    const tx = makeTx();
    const result = detectDuplicates({
      currentTransaction: tx,
      existingTransactions: [],
      existingEvents: [],
    });
    expect(result.status).toBe("unique");
  });

  it("should detect duplicate by raw_event_id", () => {
    const tx = makeTx({ raw_event_id: "evt_001" });
    const event = makeEvent({ raw_event_id: "evt_001" });
    const result = detectDuplicates({
      currentTransaction: tx,
      existingTransactions: [],
      existingEvents: [event],
    });
    expect(result.status).toBe("duplicate");
  });

  it("should detect duplicate by transaction_id", () => {
    const tx = makeTx({ transaction_id: "tx_001" });
    const existing = makeTx({ transaction_id: "tx_001" });
    const result = detectDuplicates({
      currentTransaction: tx,
      existingTransactions: [existing],
      existingEvents: [],
    });
    expect(result.status).toBe("duplicate");
  });

  it("should detect possible_duplicate on exact match", () => {
    const tx = makeTx({
      transaction_id: "tx_002",
      amount_value: 680, currency: "JPY", date: "2026-05-24", merchant: "FamilyMart",
    });
    const existing = makeTx({
      transaction_id: "tx_001",
      amount_value: 680, currency: "JPY", date: "2026-05-24", merchant: "FamilyMart",
    });
    const result = detectDuplicates({
      currentTransaction: tx,
      existingTransactions: [existing],
      existingEvents: [],
    });
    expect(result.status).toBe("possible_duplicate");
  });

  it("should be unique when amounts differ", () => {
    const tx = makeTx({
      transaction_id: "tx_002",
      amount_value: 680, currency: "JPY", date: "2026-05-24", merchant: "FamilyMart",
    });
    const existing = makeTx({
      transaction_id: "tx_001",
      amount_value: 999, currency: "JPY", date: "2026-05-24", merchant: "FamilyMart",
    });
    const result = detectDuplicates({
      currentTransaction: tx,
      existingTransactions: [existing],
      existingEvents: [],
    });
    expect(result.status).toBe("unique");
  });
});
