import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type Database from "better-sqlite3";
import { createTestDb, getRawEventById, getCanonicalTransactionById } from "@ai-budget/db";
import { ingestFixture } from "@ai-budget/cli";
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const TMP_DIR = join(import.meta.dirname, "..", "..", "tmp");
if (!existsSync(TMP_DIR)) mkdirSync(TMP_DIR, { recursive: true });

describe("ingestFixture pipeline", () => {
  let db: Database.Database;
  const fixturePath = join(TMP_DIR, "test-manual-cu.json");

  const manualFixture = {
    source_channel: "manual",
    source_name: "manual_cash_input",
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
  };

  beforeEach(() => {
    db = createTestDb();
    writeFileSync(fixturePath, JSON.stringify(manualFixture, null, 2));
  });

  afterEach(() => {
    db.close();
    if (existsSync(fixturePath)) unlinkSync(fixturePath);
  });

  it("should ingest a complete fixture and produce a valid transaction", () => {
    const result = ingestFixture(db, fixturePath);

    expect(result.status).toBe("created");
    expect(result.transaction_id).not.toBeNull();
    expect(result.validation).not.toBeNull();
    expect(result.validation!.valid).toBe(true);
    expect(result.canonical_transaction).not.toBeNull();
    expect(result.canonical_transaction!.amount_value).toBe(7000);
    expect(result.canonical_transaction!.currency).toBe("KRW");
    expect(result.canonical_transaction!.merchant).toBe("CU");
    expect(result.canonical_transaction!.actual_sync_status).toBe("not_synced");
  });

  it("should store the raw event in the database", () => {
    const result = ingestFixture(db, fixturePath);
    const event = getRawEventById(db, result.raw_event_id);
    expect(event).not.toBeNull();
    expect(event!.source_channel).toBe("manual");
    expect(event!.processed_status).toBe("processed");
  });

  it("should store the canonical transaction in the database", () => {
    const result = ingestFixture(db, fixturePath);
    const tx = getCanonicalTransactionById(db, result.transaction_id!);
    expect(tx).not.toBeNull();
    expect(tx!.amount_value).toBe(7000);
    expect(tx!.merchant).toBe("CU");
    expect(tx!.actual_sync_status).toBe("not_synced");
  });

  it("should be idempotent — second run skips", () => {
    const first = ingestFixture(db, fixturePath);
    expect(first.status).toBe("created");

    const second = ingestFixture(db, fixturePath);
    expect(second.status).toBe("skipped");
    expect(second.transaction_id).toBeNull();
    expect(second.message).toContain("already exists");
  });

  it("should mark transaction as needs_review when missing merchant", () => {
    const incompleteFixture = {
      ...manualFixture,
      body: {
        amount: 5000,
        currency: "JPY",
        payment_method: "Cash",
        actual_account_name: "Cash JPY",
      },
    };
    writeFileSync(fixturePath, JSON.stringify(incompleteFixture, null, 2));

    const result = ingestFixture(db, fixturePath);
    expect(result.status).toBe("needs_review");
    expect(result.canonical_transaction!.needs_review).toBe(true);
    expect(result.canonical_transaction!.actual_sync_status).toBe("needs_review");
  });

  it("should handle a PayPay fixture", () => {
    const paypayFixture = {
      source_channel: "phone_notification",
      source_name: "paypay",
      sender_or_app: "jp.ne.paypay.android.app",
      title: "PayPay",
      body: "ファミリーマートで680円を支払いました",
      received_at: "2026-05-24T20:15:00+09:00",
    };
    writeFileSync(fixturePath, JSON.stringify(paypayFixture, null, 2));

    const result = ingestFixture(db, fixturePath);
    expect(result.status).toBe("created");
    expect(result.canonical_transaction!.amount_value).toBe(680);
    expect(result.canonical_transaction!.currency).toBe("JPY");
    expect(result.canonical_transaction!.merchant).toBe("ファミリーマート");
  });

  it("should mark Korean unknown notification as needs_review", () => {
    const koreanFixture = {
      source_channel: "phone_notification",
      source_name: "unknown_korean_payment_app",
      sender_or_app: "unknown",
      title: "결제 알림",
      body: "결제가 완료되었습니다. 12,000원",
      received_at: "2026-05-25T20:15:00+09:00",
    };
    writeFileSync(fixturePath, JSON.stringify(koreanFixture, null, 2));

    const result = ingestFixture(db, fixturePath);
    expect(result.status).toBe("needs_review");
    expect(result.canonical_transaction!.amount_value).toBe(12000);
    expect(result.canonical_transaction!.currency).toBe("KRW");
    expect(result.canonical_transaction!.merchant).toBeNull();
    expect(result.canonical_transaction!.needs_review).toBe(true);
  });
});
