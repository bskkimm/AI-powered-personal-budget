import { describe, it, expect } from "vitest";
import { notificationToRawEvent } from "@ai-budget/collectors";
import type { AndroidNotificationPayload } from "@ai-budget/collectors";

describe("notificationToRawEvent", () => {
  const paypayPayload: AndroidNotificationPayload = {
    package_name: "jp.ne.paypay.android.app",
    app_name: "PayPay",
    title: "PayPay",
    body: "ファミリーマートで680円を支払いました",
    posted_time: "2026-05-24T20:15:00+09:00",
    notification_key: "0|jp.ne.paypay.android.app|1|null|1000",
  };

  const koreanPayload: AndroidNotificationPayload = {
    package_name: "unknown",
    app_name: null,
    title: "결제 알림",
    body: "결제가 완료되었습니다. 12,000원",
    posted_time: "2026-05-25T20:15:00+09:00",
    notification_key: "0|unknown|1|null|2000",
  };

  describe("PayPay notification", () => {
    it("should set source_channel to phone_notification", () => {
      const event = notificationToRawEvent(paypayPayload);
      expect(event.source_channel).toBe("phone_notification");
    });

    it("should use app_name as source_name", () => {
      const event = notificationToRawEvent(paypayPayload);
      expect(event.source_name).toBe("PayPay");
    });

    it("should use package_name as sender_or_app", () => {
      const event = notificationToRawEvent(paypayPayload);
      expect(event.sender_or_app).toBe("jp.ne.paypay.android.app");
    });

    it("should preserve notification title", () => {
      const event = notificationToRawEvent(paypayPayload);
      expect(event.title).toBe("PayPay");
    });

    it("should preserve notification body verbatim", () => {
      const event = notificationToRawEvent(paypayPayload);
      expect(event.body).toBe("ファミリーマートで680円を支払いました");
    });

    it("should use posted_time as received_at", () => {
      const event = notificationToRawEvent(paypayPayload);
      expect(event.received_at).toBe("2026-05-24T20:15:00+09:00");
    });

    it("should use notification_key as external_source_id", () => {
      const event = notificationToRawEvent(paypayPayload);
      expect(event.external_source_id).toBe(
        "0|jp.ne.paypay.android.app|1|null|1000",
      );
    });

    it("should generate a stable raw_event_id from notification_key", () => {
      const e1 = notificationToRawEvent(paypayPayload);
      const e2 = notificationToRawEvent(paypayPayload);
      expect(e1.raw_event_id).toBe(e2.raw_event_id);
      expect(e1.raw_event_id).toMatch(/^evt_[a-f0-9]{12}$/);
    });

    it("should set processed_status to pending", () => {
      const event = notificationToRawEvent(paypayPayload);
      expect(event.processed_status).toBe("pending");
    });
  });

  describe("Korean unknown notification", () => {
    it("should handle null app_name", () => {
      const event = notificationToRawEvent(koreanPayload);
      expect(event.source_name).toBeNull();
    });

    it("should preserve Korean text body", () => {
      const event = notificationToRawEvent(koreanPayload);
      expect(event.body).toBe("결제가 완료되었습니다. 12,000원");
    });

    it("should produce different IDs for different notification_keys", () => {
      const e1 = notificationToRawEvent(paypayPayload);
      const e2 = notificationToRawEvent(koreanPayload);
      expect(e1.raw_event_id).not.toBe(e2.raw_event_id);
    });
  });
});
