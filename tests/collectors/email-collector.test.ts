import { describe, it, expect } from "vitest";
import { emailToRawEvent, GmailCollector } from "@ai-budget/collectors";
import type { ParsedEmail } from "@ai-budget/collectors";

describe("emailToRawEvent", () => {
  const smbcEmail: ParsedEmail = {
    message_id: "<abc123@smbc-card.com>",
    thread_id: "<thread_001@smbc-card.com>",
    sender: "example@smbc-card.com",
    subject: "ご利用通知",
    body: "カードをご利用いただきました。金額: 520円 店舗: Starbucks",
    received_at: "2026-05-24T20:10:00+09:00",
  };

  it("should preserve original sender", () => {
    const event = emailToRawEvent(smbcEmail, "smbc");
    expect(event.sender_or_app).toBe("example@smbc-card.com");
  });

  it("should preserve original subject as title", () => {
    const event = emailToRawEvent(smbcEmail, "smbc");
    expect(event.title).toBe("ご利用通知");
  });

  it("should preserve original body", () => {
    const event = emailToRawEvent(smbcEmail, "smbc");
    expect(event.body).toBe(
      "カードをご利用いただきました。金額: 520円 店舗: Starbucks",
    );
  });

  it("should preserve received_at", () => {
    const event = emailToRawEvent(smbcEmail, "smbc");
    expect(event.received_at).toBe("2026-05-24T20:10:00+09:00");
  });

  it("should use message_id as external_source_id", () => {
    const event = emailToRawEvent(smbcEmail, "smbc");
    expect(event.external_source_id).toBe("<abc123@smbc-card.com>");
  });

  it("should set source_channel to email", () => {
    const event = emailToRawEvent(smbcEmail, "smbc");
    expect(event.source_channel).toBe("email");
  });

  it("should set source_name from parameter", () => {
    const event = emailToRawEvent(smbcEmail, "smbc");
    expect(event.source_name).toBe("smbc");
  });

  it("should generate a stable raw_event_id from message_id", () => {
    const e1 = emailToRawEvent(smbcEmail, "smbc");
    const e2 = emailToRawEvent(smbcEmail, "smbc");
    expect(e1.raw_event_id).toBe(e2.raw_event_id);
    expect(e1.raw_event_id).toMatch(/^evt_[a-f0-9]{12}$/);
  });

  it("should produce different IDs for different message_ids", () => {
    const otherEmail: ParsedEmail = {
      ...smbcEmail,
      message_id: "<xyz789@other.com>",
    };
    const e1 = emailToRawEvent(smbcEmail, "smbc");
    const e2 = emailToRawEvent(otherEmail, "smbc");
    expect(e1.raw_event_id).not.toBe(e2.raw_event_id);
  });

  it("should default processed_status to pending", () => {
    const event = emailToRawEvent(smbcEmail, "smbc");
    expect(event.processed_status).toBe("pending");
  });

  it("should handle null thread_id", () => {
    const noThread: ParsedEmail = {
      ...smbcEmail,
      thread_id: null,
    };
    const event = emailToRawEvent(noThread, "smbc");
    expect(event.title).toBe("ご利用通知");
    expect(event.source_channel).toBe("email");
  });
});

describe("GmailCollector", () => {
  it("should implement EmailCollector interface", () => {
    const collector = new GmailCollector();
    expect(typeof collector.fetchUnprocessed).toBe("function");
    expect(typeof collector.toRawEvent).toBe("function");
  });

  it("should return empty array from fetchUnprocessed (placeholder)", async () => {
    const collector = new GmailCollector();
    const emails = await collector.fetchUnprocessed();
    expect(emails).toEqual([]);
  });

  it("should convert ParsedEmail to RawEvent via toRawEvent", () => {
    const collector = new GmailCollector();
    const email: ParsedEmail = {
      message_id: "<msg@test.com>",
      thread_id: null,
      sender: "alerts@bank.com",
      subject: "Purchase notification",
      body: "You paid $12.00 at Coffee Shop.",
      received_at: "2026-05-25T10:00:00+09:00",
    };
    const event = collector.toRawEvent(email, "test-bank");
    expect(event.source_channel).toBe("email");
    expect(event.sender_or_app).toBe("alerts@bank.com");
    expect(event.title).toBe("Purchase notification");
    expect(event.body).toBe("You paid $12.00 at Coffee Shop.");
    expect(event.external_source_id).toBe("<msg@test.com>");
  });
});
