import type Database from "better-sqlite3";
import type { RawEvent, CanonicalTransaction } from "@ai-budget/core";
import type { ExtractionResult } from "@ai-budget/core";
import {
  validateTransaction,
  detectDuplicates,
  resolveAccountMapping,
  resolveCategoryMapping,
} from "@ai-budget/core";
import { extractFromRawEvent } from "@ai-budget/extractor";
import {
  insertRawEvent,
  getRawEventById,
  updateRawEventStatus,
  insertCanonicalTransaction,
} from "@ai-budget/db";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { randomUUID } from "node:crypto";

export interface PipelineResult {
  status: "skipped" | "created" | "needs_review";
  raw_event_id: string;
  transaction_id: string | null;
  validation: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } | null;
  canonical_transaction: CanonicalTransaction | null;
  message: string;
}

function loadFixture(path: string): Record<string, unknown> {
  const raw = readFileSync(path, "utf-8");
  return JSON.parse(raw);
}

function generateEventId(fixture: Record<string, unknown>): string {
  const hash = createHash("sha256")
    .update(JSON.stringify(fixture))
    .digest("hex")
    .slice(0, 12);
  return `evt_${hash}`;
}

function fixtureToRawEvent(
  fixture: Record<string, unknown>,
): RawEvent {
  const now = new Date().toISOString();
  return {
    raw_event_id: generateEventId(fixture),
    source_channel: (fixture.source_channel as RawEvent["source_channel"]) ?? "manual",
    source_name: (fixture.source_name as string) ?? null,
    sender_or_app: (fixture.sender_or_app as string) ?? null,
    title: (fixture.title as string) ?? null,
    body: (fixture.body as string | Record<string, unknown>) ?? "",
    received_at: (fixture.received_at as string) ?? now,
    external_source_id: (fixture.external_source_id as string) ?? null,
    processed_status: "pending",
    error_message: null,
    created_at: now,
  };
}

function extractionToCanonical(
  extraction: ExtractionResult,
  rawEvent: RawEvent,
): CanonicalTransaction {
  const now = new Date().toISOString();
  const month = extraction.datetime
    ? extraction.datetime.slice(0, 7)
    : rawEvent.received_at.slice(0, 7);
  const date = extraction.datetime
    ? extraction.datetime.slice(0, 10)
    : rawEvent.received_at.slice(0, 10);

  const accountMapping = resolveAccountMapping(
    rawEvent.source_name,
    extraction.payment_platform ?? extraction.payment_method,
  );

  const categoryMapping = resolveCategoryMapping(extraction.merchant);

  return {
    transaction_id: `tx_${randomUUID().slice(0, 12)}`,
    raw_event_id: rawEvent.raw_event_id,
    datetime: extraction.datetime,
    date,
    month,
    country: extraction.country,
    amount_value: extraction.amount_value,
    currency: extraction.currency,
    display_amount: extraction.display_amount,
    merchant: extraction.merchant,
    payment_platform: extraction.payment_platform,
    payment_method: extraction.payment_method,
    transaction_type: extraction.transaction_type,
    category: categoryMapping?.category ?? extraction.category ?? "Uncategorized",
    subcategory: categoryMapping?.subcategory ?? extraction.subcategory,
    actual_account_id: extraction.actual_account_id ?? accountMapping?.actualAccountId ?? null,
    actual_account_name: accountMapping?.actualAccountName ?? extraction.actual_account_id ?? null,
    actual_category_id: extraction.actual_category_id,
    actual_category_name: categoryMapping?.category ?? null,
    source_channel: rawEvent.source_channel,
    source_name: rawEvent.source_name,
    auto_or_manual: rawEvent.source_channel === "manual" ? "manual" : "auto",
    needs_review: extraction.needs_review,
    confidence_score: Math.min(
      1,
      Object.values(extraction.confidence).reduce((a, b) => a + b, 0) /
        Object.keys(extraction.confidence).length,
    ),
    memo: extraction.memo,
    raw_text: typeof rawEvent.body === "string" ? rawEvent.body : JSON.stringify(rawEvent.body),
    duplicate_status: "unique",
    actual_sync_status: "not_synced",
    actual_transaction_id: null,
    created_at: now,
    updated_at: now,
  };
}

export function ingestFixture(
  db: Database.Database,
  fixturePath: string,
): PipelineResult {
  const fixture = loadFixture(fixturePath);
  const rawEvent = fixtureToRawEvent(fixture);

  const existing = getRawEventById(db, rawEvent.raw_event_id);
  if (existing) {
    return {
      status: "skipped",
      raw_event_id: rawEvent.raw_event_id,
      transaction_id: null,
      validation: null,
      canonical_transaction: null,
      message: `Raw event ${rawEvent.raw_event_id} already exists. Skipping.`,
    };
  }

  insertRawEvent(db, rawEvent);

  const extraction = extractFromRawEvent(rawEvent);

  const canonical = extractionToCanonical(extraction, rawEvent);

  const validation = validateTransaction(canonical);

  const dupResult = detectDuplicates({
    currentTransaction: canonical,
    existingTransactions: [],
    existingEvents: [],
  });

  if (dupResult.status !== "unique") {
    canonical.duplicate_status = dupResult.status;
  }

  let actualSyncStatus: CanonicalTransaction["actual_sync_status"];

  if (!validation.valid) {
    canonical.needs_review = true;
    actualSyncStatus = "needs_review";
  } else if (validation.needs_review) {
    canonical.needs_review = true;
    actualSyncStatus = "needs_review";
  } else {
    actualSyncStatus = "not_synced";
  }

  canonical.actual_sync_status = actualSyncStatus;

  insertCanonicalTransaction(db, canonical);

  updateRawEventStatus(db, rawEvent.raw_event_id, "processed");

  if (actualSyncStatus === "needs_review") {
    return {
      status: "needs_review",
      raw_event_id: rawEvent.raw_event_id,
      transaction_id: canonical.transaction_id,
      validation: {
        valid: validation.valid,
        errors: validation.errors,
        warnings: validation.warnings,
      },
      canonical_transaction: canonical,
      message: `Transaction ${canonical.transaction_id} needs review.`,
    };
  }

  return {
    status: "created",
    raw_event_id: rawEvent.raw_event_id,
    transaction_id: canonical.transaction_id,
    validation: {
      valid: validation.valid,
      errors: validation.errors,
      warnings: validation.warnings,
    },
    canonical_transaction: canonical,
    message: `Created transaction ${canonical.transaction_id} ready for sync.`,
  };
}
