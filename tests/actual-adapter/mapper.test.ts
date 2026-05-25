import { describe, it, expect } from "vitest";
import { mapCanonicalToActual } from "@ai-budget/actual-adapter";
import type { CanonicalTransaction } from "@ai-budget/core";

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

describe("mapCanonicalToActual", () => {
  it("should map date from canonical transaction", () => {
    const tx = makeTx();
    const result = mapCanonicalToActual(tx);
    expect(result.date).toBe("2026-05-24");
  });

  it("should map merchant to payee", () => {
    const tx = makeTx({ merchant: "Starbucks" });
    const result = mapCanonicalToActual(tx);
    expect(result.payee).toBe("Starbucks");
  });

  it("should map null merchant to null payee", () => {
    const tx = makeTx({ merchant: null });
    const result = mapCanonicalToActual(tx);
    expect(result.payee).toBeNull();
  });

  it("should map actual_account_name to account", () => {
    const tx = makeTx({ actual_account_name: "PayPay" });
    const result = mapCanonicalToActual(tx);
    expect(result.account).toBe("PayPay");
  });

  it("should map actual_category_name to category", () => {
    const tx = makeTx({
      actual_category_name: "Convenience Store",
      category: null,
    });
    const result = mapCanonicalToActual(tx);
    expect(result.category).toBe("Convenience Store");
  });

  it("should fall back to category when actual_category_name is null", () => {
    const tx = makeTx({
      actual_category_name: null,
      category: "Cafe",
    });
    const result = mapCanonicalToActual(tx);
    expect(result.category).toBe("Cafe");
  });

  it("should use amount_value for amount", () => {
    const tx = makeTx({ amount_value: 7000, currency: "KRW" });
    const result = mapCanonicalToActual(tx);
    expect(result.amount).toBe(7000);
  });

  it("should include raw_event_id and transaction_id in notes", () => {
    const tx = makeTx();
    const result = mapCanonicalToActual(tx);
    expect(result.notes).toContain("raw_event_id=evt_001");
    expect(result.notes).toContain("transaction_id=tx_001");
  });

  it("should use transaction_id as import_id", () => {
    const tx = makeTx({ transaction_id: "tx_import_123" });
    const result = mapCanonicalToActual(tx);
    expect(result.import_id).toBe("tx_import_123");
  });

  it("should default cleared to false", () => {
    const tx = makeTx();
    const result = mapCanonicalToActual(tx);
    expect(result.cleared).toBe(false);
  });

  it("should default to today when date is null", () => {
    const tx = makeTx({ date: null, datetime: null });
    const result = mapCanonicalToActual(tx);
    expect(result.date).toBe(new Date().toISOString().slice(0, 10));
  });

  it("should default to Uncategorized when account and category are null", () => {
    const tx = makeTx({
      actual_account_id: null,
      actual_account_name: null,
      actual_category_id: null,
      actual_category_name: null,
      category: null,
    });
    const result = mapCanonicalToActual(tx);
    expect(result.account).toBe("Uncategorized");
    expect(result.category).toBe("Uncategorized");
  });
});
