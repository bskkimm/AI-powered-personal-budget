import { describe, it, expect } from "vitest";
import { buildReviewQueueItem } from "@ai-budget/core";
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

describe("buildReviewQueueItem", () => {
  it("should return null for a valid transaction", () => {
    const tx = makeTx();
    const item = buildReviewQueueItem(tx, { valid: true, errors: [], warnings: [], needs_review: false });
    expect(item).toBeNull();
  });

  it("should create review item when needs_review is true", () => {
    const tx = makeTx({ needs_review: true });
    const item = buildReviewQueueItem(tx, { valid: true, errors: [], warnings: [], needs_review: false });
    expect(item).not.toBeNull();
    expect(item!.reason).toContain("needs_review is true");
  });

  it("should include validation errors in reason", () => {
    const tx = makeTx({ amount_value: null });
    const item = buildReviewQueueItem(tx, {
      valid: false, errors: ["amount_value is missing"], warnings: [], needs_review: false,
    });
    expect(item).not.toBeNull();
    expect(item!.reason).toContain("amount_value is missing");
  });

  it("should include missing merchant in reason", () => {
    const tx = makeTx({ merchant: null });
    const item = buildReviewQueueItem(tx, { valid: true, errors: [], warnings: ["merchant is missing"], needs_review: false });
    expect(item).not.toBeNull();
    expect(item!.reason).toContain("merchant is missing");
  });

  it("should include low confidence in reason", () => {
    const tx = makeTx({ confidence_score: 0.2 });
    const item = buildReviewQueueItem(tx, { valid: true, errors: [], warnings: [], needs_review: false });
    expect(item).not.toBeNull();
    expect(item!.reason).toContain("confidence score too low");
  });

  it("should set status to pending", () => {
    const tx = makeTx({ needs_review: true });
    const item = buildReviewQueueItem(tx, { valid: true, errors: [], warnings: [], needs_review: false });
    expect(item!.status).toBe("pending");
  });
});
