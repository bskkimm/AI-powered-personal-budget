import { describe, it, expect } from "vitest";
import { validateTransaction } from "@ai-budget/core";
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

describe("validateTransaction", () => {
  it("should pass a valid manual KRW transaction", () => {
    const tx = makeTx({
      amount_value: 7000,
      currency: "KRW",
      display_amount: "₩7,000",
      merchant: "CU",
      category: "Convenience Store",
      country: "KR",
      actual_account_name: "Cash KRW",
      source_channel: "manual",
      source_name: "manual_cash_input",
      auto_or_manual: "manual",
    });
    const result = validateTransaction(tx);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.needs_review).toBe(false);
  });

  it("should block sync when amount_value is missing", () => {
    const tx = makeTx({ amount_value: null, display_amount: null });
    const result = validateTransaction(tx);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("amount_value is missing");
  });

  it("should block sync when currency is missing", () => {
    const tx = makeTx({ currency: null });
    const result = validateTransaction(tx);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("currency is missing");
  });

  it("should block sync when account mapping is missing", () => {
    const tx = makeTx({
      actual_account_id: null,
      actual_account_name: null,
    });
    const result = validateTransaction(tx);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "actual_account_id and actual_account_name are both missing",
    );
  });

  it("should allow sync when only actual_account_name is set", () => {
    const tx = makeTx({
      actual_account_id: null,
      actual_account_name: "PayPay",
    });
    const result = validateTransaction(tx);
    expect(result.valid).toBe(true);
  });

  it("should block sync when duplicate_status is possible_duplicate", () => {
    const tx = makeTx({ duplicate_status: "possible_duplicate" });
    const result = validateTransaction(tx);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("duplicate_status is possible_duplicate");
  });

  it("should block sync when needs_review is true", () => {
    const tx = makeTx({ needs_review: true });
    const result = validateTransaction(tx);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("needs_review is true");
  });

  it("should warn and set needs_review when merchant is missing", () => {
    const tx = makeTx({ merchant: null });
    const result = validateTransaction(tx);
    expect(result.valid).toBe(true);
    expect(result.warnings).toContain("merchant is missing");
    expect(result.needs_review).toBe(true);
  });

  it("should warn and set needs_review when category is missing and not Uncategorized", () => {
    const tx = makeTx({ category: null, actual_category_name: null });
    const result = validateTransaction(tx);
    expect(result.valid).toBe(true);
    expect(result.warnings).toContain("category is missing");
    expect(result.needs_review).toBe(true);
  });

  it("should allow missing category when set to Uncategorized", () => {
    const tx = makeTx({ category: "Uncategorized" });
    const result = validateTransaction(tx);
    expect(result.valid).toBe(true);
    expect(result.needs_review).toBe(false);
  });

  it("should allow missing category when actual_category_name is Uncategorized", () => {
    const tx = makeTx({
      category: null,
      actual_category_name: "Uncategorized",
    });
    const result = validateTransaction(tx);
    expect(result.valid).toBe(true);
    expect(result.needs_review).toBe(false);
  });

  it("should block sync when amount_value is NaN", () => {
    const tx = makeTx({ amount_value: NaN });
    const result = validateTransaction(tx);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("amount_value must be a valid number");
  });

  it("should block sync when duplicate_status is duplicate", () => {
    const tx = makeTx({ duplicate_status: "duplicate" });
    const result = validateTransaction(tx);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("duplicate_status is duplicate");
  });
});
