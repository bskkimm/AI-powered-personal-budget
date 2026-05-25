import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type Database from "better-sqlite3";
import { createTestDb } from "@ai-budget/db";
import {
  insertRawEvent,
  getRawEventById,
  listPendingRawEvents,
  updateRawEventStatus,
} from "@ai-budget/db";
import type { RawEvent } from "@ai-budget/core";

describe("raw events repository", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
  });

  afterEach(() => {
    db.close();
  });

  const makeEvent = (overrides: Partial<RawEvent> = {}): RawEvent => ({
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
    ...overrides,
  });

  it("should insert and retrieve a raw event", () => {
    const event = makeEvent();
    insertRawEvent(db, event);

    const found = getRawEventById(db, "evt_001");
    expect(found).not.toBeNull();
    expect(found!.raw_event_id).toBe("evt_001");
    expect(found!.source_channel).toBe("phone_notification");
    expect(found!.source_name).toBe("paypay");
    expect(found!.body).toBe("ファミリーマートで680円を支払いました");
    expect(found!.processed_status).toBe("pending");
  });

  it("should store body as object when given a JSON body", () => {
    const event = makeEvent({
      raw_event_id: "evt_002",
      source_channel: "manual",
      body: { amount: 7000, currency: "KRW" },
    });
    insertRawEvent(db, event);

    const found = getRawEventById(db, "evt_002");
    expect(found).not.toBeNull();
    expect(typeof found!.body).toBe("object");
    expect((found!.body as Record<string, unknown>).amount).toBe(7000);
  });

  it("should return null for unknown id", () => {
    const found = getRawEventById(db, "nonexistent");
    expect(found).toBeNull();
  });

  it("should list pending raw events", () => {
    const e1 = makeEvent({ raw_event_id: "evt_001" });
    const e2 = makeEvent({
      raw_event_id: "evt_002",
      processed_status: "processed",
    });
    const e3 = makeEvent({ raw_event_id: "evt_003" });
    insertRawEvent(db, e1);
    insertRawEvent(db, e2);
    insertRawEvent(db, e3);

    const pending = listPendingRawEvents(db);
    expect(pending).toHaveLength(2);
    expect(pending.map((e) => e.raw_event_id).sort()).toEqual([
      "evt_001",
      "evt_003",
    ]);
  });

  it("should update raw event status", () => {
    const event = makeEvent();
    insertRawEvent(db, event);
    updateRawEventStatus(db, "evt_001", "processed");

    const found = getRawEventById(db, "evt_001");
    expect(found!.processed_status).toBe("processed");
  });

  it("should update status with error message", () => {
    const event = makeEvent();
    insertRawEvent(db, event);
    updateRawEventStatus(db, "evt_001", "failed", "Extraction error");

    const found = getRawEventById(db, "evt_001");
    expect(found!.processed_status).toBe("failed");
    expect(found!.error_message).toBe("Extraction error");
  });
});
