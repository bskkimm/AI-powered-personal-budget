import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type Database from "better-sqlite3";
import { createTestDb } from "@ai-budget/db";
import { handleAndroidWebhook } from "@ai-budget/collectors";

describe("handleAndroidWebhook", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
  });

  afterEach(() => {
    db.close();
  });

  const validInput = {
    package_name: "jp.ne.paypay.android.app",
    app_name: "PayPay",
    title: "PayPay",
    body: "ファミリーマートで680円を支払いました",
    posted_time: "2026-05-24T20:15:00+09:00",
    notification_key: "0|jp.ne.paypay.android.app|1|null|1000",
    secret: "test-secret",
  };

  it("should store a valid notification as RawEvent", () => {
    const result = handleAndroidWebhook(db, validInput);
    expect(result.success).toBe(true);
    expect(result.raw_event_id).toMatch(/^evt_[a-f0-9]{12}$/);
    expect(result.error).toBeNull();
  });

  it("should reject invalid webhook secret when expectedSecret is set", () => {
    const result = handleAndroidWebhook(db, validInput, "correct-secret");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Unauthorized");
  });

  it("should accept when expectedSecret is undefined", () => {
    const result = handleAndroidWebhook(db, validInput);
    expect(result.success).toBe(true);
  });

  it("should reject missing required fields", () => {
    const result = handleAndroidWebhook(db, {
      ...validInput,
      notification_key: "",
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("Missing required fields");
  });

  it("should be idempotent — same notification_key returns same raw_event_id", () => {
    const r1 = handleAndroidWebhook(db, validInput);
    const r2 = handleAndroidWebhook(db, validInput);
    expect(r1.raw_event_id).toBe(r2.raw_event_id);
  });
});
