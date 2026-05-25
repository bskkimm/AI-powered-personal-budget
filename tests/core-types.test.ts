import { describe, it, expect } from "vitest";
import type { RawEvent, CanonicalTransaction } from "@ai-budget/core";

describe("RawEvent type", () => {
  it("should allow a valid PayPay raw event", () => {
    const event: RawEvent = {
      raw_event_id: "evt_001",
      source_channel: "phone_notification",
      source_name: "paypay",
      sender_or_app: "jp.ne.paypay.android.app",
      title: "PayPay",
      body: "ファミリーマートで680円を支払いました",
      received_at: "2026-05-24T20:15:00+09:00",
      external_source_id: null,
      processed_status: "pending",
      error_message: null,
      created_at: "2026-05-24T20:15:00+09:00",
    };
    expect(event.source_channel).toBe("phone_notification");
    expect(event.amount_value).toBeUndefined();
  });

  it("should allow body as object for manual input", () => {
    const event: RawEvent = {
      raw_event_id: "evt_002",
      source_channel: "manual",
      source_name: "manual_cash_input",
      sender_or_app: null,
      title: null,
      body: { amount: 7000, currency: "KRW", merchant: "CU" },
      received_at: "2026-05-25T21:00:00+09:00",
      external_source_id: null,
      processed_status: "pending",
      error_message: null,
      created_at: "2026-05-25T21:00:00+09:00",
    };
    expect(typeof event.body).toBe("object");
  });
});

describe("CanonicalTransaction type", () => {
  it("should create a transaction with required fields", () => {
    const tx: CanonicalTransaction = {
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
    };
    expect(tx.amount_value).toBe(680);
    expect(tx.currency).toBe("JPY");
    expect(tx.needs_review).toBe(false);
  });

  it("should mark unknown transactions for review", () => {
    const tx: CanonicalTransaction = {
      transaction_id: "tx_002",
      raw_event_id: "evt_002",
      datetime: "2026-05-25T20:15:00+09:00",
      date: "2026-05-25",
      month: "2026-05",
      country: null,
      amount_value: 12000,
      currency: "KRW",
      display_amount: "₩12,000",
      merchant: null,
      payment_platform: null,
      payment_method: null,
      transaction_type: "expense",
      category: null,
      subcategory: null,
      actual_account_id: null,
      actual_account_name: null,
      actual_category_id: null,
      actual_category_name: null,
      source_channel: "phone_notification",
      source_name: "unknown_korean_payment_app",
      auto_or_manual: "auto",
      needs_review: true,
      confidence_score: 0.3,
      memo: null,
      raw_text: null,
      duplicate_status: "unique",
      actual_sync_status: "needs_review",
      actual_transaction_id: null,
      created_at: "2026-05-25T20:15:00+09:00",
      updated_at: "2026-05-25T20:15:00+09:00",
    };
    expect(tx.merchant).toBeNull();
    expect(tx.needs_review).toBe(true);
    expect(tx.actual_sync_status).toBe("needs_review");
  });

  it("should keep amount_value as number and currency as ISO code", () => {
    const tx: CanonicalTransaction = {
      transaction_id: "tx_003",
      raw_event_id: "evt_003",
      datetime: null,
      date: null,
      month: null,
      country: null,
      amount_value: 520,
      currency: "JPY",
      display_amount: "¥520",
      merchant: "Starbucks",
      payment_platform: null,
      payment_method: "SMBC Card",
      transaction_type: "expense",
      category: "Cafe",
      subcategory: null,
      actual_account_id: null,
      actual_account_name: null,
      actual_category_id: null,
      actual_category_name: null,
      source_channel: "email",
      source_name: "smbc",
      auto_or_manual: "auto",
      needs_review: false,
      confidence_score: 0.9,
      memo: null,
      raw_text: null,
      duplicate_status: "unique",
      actual_sync_status: "not_synced",
      actual_transaction_id: null,
      created_at: "2026-05-24T20:10:00+09:00",
      updated_at: "2026-05-24T20:10:00+09:00",
    };
    expect(typeof tx.amount_value).toBe("number");
    expect(tx.currency).toBe("JPY");
    expect(tx.amount_value).toBe(520);
  });
});
