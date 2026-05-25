import { describe, it, expect } from "vitest";
import { syncTransactions, MockActualAdapter } from "@ai-budget/actual-adapter";
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

describe("syncTransactions", () => {
  it("should sync valid transactions", async () => {
    const adapter = new MockActualAdapter();
    const txs = [makeTx({ transaction_id: "tx_a" }), makeTx({ transaction_id: "tx_b" })];
    const result = await syncTransactions({ transactions: txs, adapter });
    expect(result.synced).toHaveLength(2);
    expect(result.failed).toHaveLength(0);
    expect(result.skipped).toHaveLength(0);
    expect(txs[0].actual_sync_status).toBe("synced");
    expect(txs[0].actual_transaction_id).not.toBeNull();
  });

  it("should skip needs_review transactions", async () => {
    const adapter = new MockActualAdapter();
    const txs = [makeTx({ transaction_id: "tx_review", needs_review: true })];
    const result = await syncTransactions({ transactions: txs, adapter });
    expect(result.skipped).toHaveLength(1);
    expect(result.synced).toHaveLength(0);
  });

  it("should skip possible_duplicate transactions", async () => {
    const adapter = new MockActualAdapter();
    const txs = [makeTx({ transaction_id: "tx_dup", duplicate_status: "possible_duplicate" })];
    const result = await syncTransactions({ transactions: txs, adapter });
    expect(result.skipped).toHaveLength(1);
  });

  it("should track failed transactions", async () => {
    const adapter = new MockActualAdapter();
    const txs = [makeTx({
      transaction_id: "tx_fail",
      actual_account_id: null,
      actual_account_name: null,
    })];
    const result = await syncTransactions({ transactions: txs, adapter });
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].transaction_id).toBe("tx_fail");
  });
});
