import { describe, it, expect } from "vitest";
import { MockActualAdapter } from "@ai-budget/actual-adapter";
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

describe("MockActualAdapter", () => {
  it("should load accounts", async () => {
    const adapter = new MockActualAdapter();
    const accounts = await adapter.loadAccounts();
    expect(accounts.length).toBeGreaterThan(0);
    expect(accounts[0]).toHaveProperty("id");
    expect(accounts[0]).toHaveProperty("name");
  });

  it("should load categories", async () => {
    const adapter = new MockActualAdapter();
    const categories = await adapter.loadCategories();
    expect(categories.length).toBeGreaterThan(0);
    expect(categories[0]).toHaveProperty("id");
    expect(categories[0]).toHaveProperty("name");
  });

  it("should import a valid transaction and return actual_transaction_id", async () => {
    const adapter = new MockActualAdapter();
    const tx = makeTx();
    const result = await adapter.importTransaction(tx);

    expect(result.success).toBe(true);
    expect(result.actual_transaction_id).not.toBeNull();
    expect(result.actual_transaction_id).toMatch(/^actual_tx_\d{4}$/);
    expect(result.error_message).toBeNull();
  });

  it("should reject a transaction with needs_review true", async () => {
    const adapter = new MockActualAdapter();
    const tx = makeTx({ needs_review: true });
    const result = await adapter.importTransaction(tx);

    expect(result.success).toBe(false);
    expect(result.actual_transaction_id).toBeNull();
    expect(result.error_message).toContain("needs review");
  });

  it("should reject a transaction with possible_duplicate", async () => {
    const adapter = new MockActualAdapter();
    const tx = makeTx({ duplicate_status: "possible_duplicate" });
    const result = await adapter.importTransaction(tx);

    expect(result.success).toBe(false);
    expect(result.actual_transaction_id).toBeNull();
    expect(result.error_message).toContain("possible duplicate");
  });

  it("should reject a transaction with duplicate status", async () => {
    const adapter = new MockActualAdapter();
    const tx = makeTx({ duplicate_status: "duplicate" });
    const result = await adapter.importTransaction(tx);

    expect(result.success).toBe(false);
    expect(result.actual_transaction_id).toBeNull();
    expect(result.error_message).toContain("confirmed duplicate");
  });

  it("should reject a transaction with no account mapping", async () => {
    const adapter = new MockActualAdapter();
    const tx = makeTx({
      actual_account_id: null,
      actual_account_name: null,
    });
    const result = await adapter.importTransaction(tx);

    expect(result.success).toBe(false);
    expect(result.actual_transaction_id).toBeNull();
    expect(result.error_message).toContain("No account mapping");
  });

  it("should return empty duplicates from findPotentialDuplicates", async () => {
    const adapter = new MockActualAdapter();
    const tx = makeTx();
    const duplicates = await adapter.findPotentialDuplicates(tx);
    expect(duplicates).toEqual([]);
  });

  it("should return unique sequential actual_transaction_ids", async () => {
    const adapter = new MockActualAdapter();
    const t1 = await adapter.importTransaction(makeTx({ transaction_id: "tx_a" }));
    const t2 = await adapter.importTransaction(makeTx({ transaction_id: "tx_b" }));
    expect(t1.actual_transaction_id).not.toBeNull();
    expect(t2.actual_transaction_id).not.toBeNull();
    expect(t1.actual_transaction_id).not.toBe(t2.actual_transaction_id);
    expect(t1.actual_transaction_id).toMatch(/^actual_tx_\d{4}$/);
    expect(t2.actual_transaction_id).toMatch(/^actual_tx_\d{4}$/);
  });
});
