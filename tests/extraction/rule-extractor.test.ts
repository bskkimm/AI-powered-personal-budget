import { describe, it, expect } from "vitest";
import { extractFromRawEvent } from "@ai-budget/extractor";
import type { RawEvent } from "@ai-budget/core";

describe("rule-based extractor", () => {
  describe("PayPay FamilyMart JPY", () => {
    it("should extract amount and merchant from PayPay notification", () => {
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

      const result = extractFromRawEvent(event);

      expect(result.amount_value).toBe(680);
      expect(result.currency).toBe("JPY");
      expect(result.merchant).toBe("ファミリーマート");
      expect(result.payment_platform).toBe("PayPay");
      expect(result.payment_method).toBe("PayPay");
      expect(result.country).toBe("JP");
      expect(result.needs_review).toBe(false);
      expect(result.confidence.amount).toBe(1.0);
      expect(result.confidence.currency).toBe(1.0);
      expect(result.confidence.merchant).toBe(0.9);
    });
  });

  describe("Korean unknown notification KRW", () => {
    it("should extract amount and currency but leave merchant null", () => {
      const event: RawEvent = {
        raw_event_id: "evt_002",
        source_channel: "phone_notification",
        source_name: "unknown_korean_payment_app",
        sender_or_app: "unknown",
        title: "결제 알림",
        body: "결제가 완료되었습니다. 12,000원",
        received_at: "2026-05-25T20:15:00+09:00",
        external_source_id: null,
        processed_status: "pending",
        error_message: null,
        created_at: "2026-05-25T20:15:00+09:00",
      };

      const result = extractFromRawEvent(event);

      expect(result.amount_value).toBe(12000);
      expect(result.currency).toBe("KRW");
      expect(result.merchant).toBeNull();
      expect(result.category).toBeNull();
      expect(result.needs_review).toBe(true);
    });
  });

  describe("SMBC Starbucks JPY", () => {
    it("should extract amount and merchant from SMBC email", () => {
      const event: RawEvent = {
        raw_event_id: "evt_003",
        source_channel: "email",
        source_name: "smbc",
        sender_or_app: "example@smbc-card.com",
        title: "ご利用通知",
        body: "カードをご利用いただきました。金額: 520円 店舗: Starbucks",
        received_at: "2026-05-24T20:10:00+09:00",
        external_source_id: null,
        processed_status: "pending",
        error_message: null,
        created_at: "2026-05-24T20:10:00+09:00",
      };

      const result = extractFromRawEvent(event);

      expect(result.amount_value).toBe(520);
      expect(result.currency).toBe("JPY");
      expect(result.merchant).toBe("Starbucks");
      expect(result.payment_method).toBe("SMBC Card");
      expect(result.payment_platform).toBe("SMBC Card");
      expect(result.country).toBe("JP");
      expect(result.needs_review).toBe(false);
      expect(result.confidence.amount).toBe(1.0);
      expect(result.confidence.merchant).toBe(1.0);
    });
  });

  describe("Manual CU Cash KRW", () => {
    it("should extract fields from manual input body", () => {
      const event: RawEvent = {
        raw_event_id: "evt_004",
        source_channel: "manual",
        source_name: "manual_cash_input",
        sender_or_app: null,
        title: null,
        body: {
          amount: 7000,
          currency: "KRW",
          merchant: "CU",
          payment_method: "Cash",
          category: "Convenience store",
          country: "KR",
          actual_account_name: "Cash KRW",
        },
        received_at: "2026-05-25T21:00:00+09:00",
        external_source_id: null,
        processed_status: "pending",
        error_message: null,
        created_at: "2026-05-25T21:00:00+09:00",
      };

      const result = extractFromRawEvent(event);

      expect(result.amount_value).toBe(7000);
      expect(result.currency).toBe("KRW");
      expect(result.merchant).toBe("CU");
      expect(result.payment_method).toBe("Cash");
      expect(result.category).toBe("Convenience store");
      expect(result.country).toBe("KR");
      expect(result.actual_account_id).toBe("Cash KRW");
      expect(result.needs_review).toBe(false);
    });
  });

  describe("unknown source", () => {
    it("should return needs_review for unrecognized source", () => {
      const event: RawEvent = {
        raw_event_id: "evt_005",
        source_channel: "phone_notification",
        source_name: "unknown_app",
        sender_or_app: null,
        title: "Payment",
        body: "Paid $10.00 at Coffee Shop",
        received_at: "2026-05-25T12:00:00+09:00",
        external_source_id: null,
        processed_status: "pending",
        error_message: null,
        created_at: "2026-05-25T12:00:00+09:00",
      };

      const result = extractFromRawEvent(event);

      expect(result.needs_review).toBe(true);
      expect(result.amount_value).toBeNull();
      expect(result.currency).toBeNull();
      expect(result.merchant).toBeNull();
    });
  });
});
