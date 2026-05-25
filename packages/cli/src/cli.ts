import dotenv from "dotenv";
dotenv.config();
import { ingestFixture } from "./pipeline.js";
import {
  getDb, initSchema,
  getCanonicalTransactionById,
  updateSyncStatus,
  insertRawEvent,
  getRawEventById,
  insertCanonicalTransaction,
} from "@ai-budget/db";
import { ActualBudgetApiAdapter } from "@ai-budget/actual-adapter";
import { syncTransactions } from "@ai-budget/actual-adapter";
import { NotionApiWriter, ensureMonthlyHierarchy } from "@ai-budget/notion-writer";
import { emailToRawEvent } from "@ai-budget/collectors";
import { extractFromRawEvent } from "@ai-budget/extractor";
import { validateTransaction, resolveAccountMapping, resolveCategoryMapping } from "@ai-budget/core";
import type { CanonicalTransaction, RawEvent } from "@ai-budget/core";
import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";

const args = process.argv.slice(2);
const command = args[0];

function usage() {
  console.error("Usage:");
  console.error("  pnpm finance ingest:fixture <path>");
  console.error("  pnpm finance fetch:gmail [sourceName]");
  console.error("  pnpm finance sync");
  console.error("  pnpm finance sync:notion");
  console.error("  pnpm finance status");
}

if (!command) {
  usage();
  process.exit(1);
}

const db = getDb();
initSchema(db);

function extractionToCanonicalQuick(extraction: any, rawEvent: RawEvent): CanonicalTransaction {
  const now = new Date().toISOString();
  const month = extraction.datetime?.slice(0, 7) ?? rawEvent.received_at.slice(0, 7);
  const date = extraction.datetime?.slice(0, 10) ?? rawEvent.received_at.slice(0, 10);
  const accountMapping = resolveAccountMapping(rawEvent.source_name, extraction.payment_platform ?? extraction.payment_method);
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
    confidence_score: Math.min(1, (Object.values(extraction.confidence ?? {}) as number[]).reduce((a, b) => a + b, 0) / 6),
    memo: extraction.memo,
    raw_text: typeof rawEvent.body === "string" ? rawEvent.body : JSON.stringify(rawEvent.body),
    duplicate_status: "unique",
    actual_sync_status: "not_synced",
    actual_transaction_id: null,
    created_at: now,
    updated_at: now,
  };
}

async function main() {
  switch (command) {
    case "ingest:fixture": {
      const fixturePath = args[1];
      if (!fixturePath) {
        console.error("Usage: pnpm finance ingest:fixture <path>");
        process.exit(1);
      }
      const result = ingestFixture(db, fixturePath);
      console.log(JSON.stringify(result, null, 2));
      break;
    }

    case "fetch:gmail": {
      await runFetchGmail(db, args[1] ?? "gmail");
      break;
    }

    case "sync": {
      await runSync(db);
      break;
    }

    case "sync:notion": {
      await runNotionSync(db);
      break;
    }

    case "status": {
      const rows = [
        { label: "Total transactions", q: "SELECT COUNT(*) as count FROM canonical_transactions" },
        { label: "Synced", q: "SELECT COUNT(*) as count FROM canonical_transactions WHERE actual_sync_status = 'synced'" },
        { label: "Not synced", q: "SELECT COUNT(*) as count FROM canonical_transactions WHERE actual_sync_status = 'not_synced'" },
        { label: "Needs review", q: "SELECT COUNT(*) as count FROM canonical_transactions WHERE actual_sync_status = 'needs_review'" },
        { label: "Sync failed", q: "SELECT COUNT(*) as count FROM canonical_transactions WHERE actual_sync_status = 'sync_failed'" },
        { label: "Raw events pending", q: "SELECT COUNT(*) as count FROM raw_events WHERE processed_status = 'pending'" },
      ];
      console.log("Status:");
      for (const r of rows) {
        const { count } = db.prepare(r.q).get() as { count: number };
        console.log(`  ${r.label.padEnd(20)} ${count}`);
      }
      break;
    }

    case "auto": {
      // Step 1: Fetch Gmail
      console.log("[auto] Fetching Gmail...");
      await runFetchGmail(db, args[1] ?? "gmail");

      // Step 2: Sync to Actual Budget
      console.log("[auto] Syncing to Actual Budget...");
      await runSync(db);

      // Step 3: Sync to Notion
      console.log("[auto] Updating Notion...");
      await runNotionSync(db);

      console.log("[auto] Done.");
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      usage();
      process.exit(1);
  }
}

async function runFetchGmail(db: any, sourceName: string) {
  const { google } = await import("googleapis");
  const oauth = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
  );
  oauth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
  const gmail = google.gmail({ version: "v1", auth: oauth });

  const listResp = await gmail.users.messages.list({
    userId: "me", maxResults: 10, q: "is:unread",
  });
  const messages = listResp.data.messages ?? [];
  console.log(`  ${messages.length} unread messages`);

  let processed = 0;
  for (const msg of messages) {
    const full = await gmail.users.messages.get({ userId: "me", id: msg.id!, format: "full" });
    const headers = full.data.payload?.headers ?? [];
    const subject = headers.find((h: any) => h.name === "Subject")?.value ?? "";
    const from = headers.find((h: any) => h.name === "From")?.value ?? "";
    const messageId = headers.find((h: any) => h.name === "Message-ID")?.value ?? msg.id!;
    let body = "";
    const parts = full.data.payload?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.mimeType === "text/plain" && part.body?.data) {
          body = Buffer.from(part.body.data, "base64").toString("utf-8");
          break;
        }
      }
    } else if (full.data.payload?.body?.data) {
      body = Buffer.from(full.data.payload.body.data, "base64").toString("utf-8");
    }
    const email = {
      message_id: messageId, thread_id: full.data.threadId ?? null,
      sender: from, subject, body,
      received_at: new Date(Number(full.data.internalDate)).toISOString(),
    };
    const eventId = `evt_${createHash("sha256").update(messageId).digest("hex").slice(0, 12)}`;
    if (getRawEventById(db, eventId)) continue;
    const rawEvent = emailToRawEvent(email, sourceName);
    insertRawEvent(db, rawEvent);
    const extraction = extractFromRawEvent(rawEvent);
    const canonical = extractionToCanonicalQuick(extraction, rawEvent);
    const validation = validateTransaction(canonical);
    if (!validation.valid || validation.needs_review || canonical.needs_review) {
      canonical.actual_sync_status = "needs_review";
      canonical.needs_review = true;
    }
    insertCanonicalTransaction(db, canonical);
    processed++;
  }
  console.log(`  ${processed} new`);
}

async function runSync(db: any) {
  const serverURL = process.env.ACTUAL_SERVER_URL;
  const password = process.env.ACTUAL_PASSWORD;
  const budgetId = process.env.ACTUAL_BUDGET_ID;
  const dataDir = process.env.ACTUAL_DATA_DIR ?? "./actual-data";
  if (!budgetId) { console.error("  Missing ACTUAL_BUDGET_ID"); return; }

  const adapter = new ActualBudgetApiAdapter({
    serverURL: serverURL ?? "", password: password ?? "", budgetId, dataDir,
  });
  await adapter.connect();

  const pending = db
    .prepare("SELECT transaction_id FROM canonical_transactions WHERE actual_sync_status = 'not_synced' ORDER BY date ASC")
    .all() as { transaction_id: string }[];

  if (pending.length === 0) {
    console.log("  No pending transactions");
    await adapter.disconnect();
    return;
  }

  const txs = pending
    .map((r: any) => getCanonicalTransactionById(db, r.transaction_id))
    .filter((tx: any) => tx !== null);

  const result = await syncTransactions({ transactions: txs as any, adapter: adapter as any });
  console.log(`  Synced: ${result.synced.length}, Skipped: ${result.skipped.length}, Failed: ${result.failed.length}`);

  for (const tx of txs) {
    if ((tx as any).actual_sync_status === "synced") {
      updateSyncStatus(db, (tx as any).transaction_id, "synced", (tx as any).actual_transaction_id);
    }
  }
  await adapter.disconnect();
}

async function runNotionSync(db: any) {
  const token = process.env.NOTION_TOKEN;
  if (!token) { console.error("  Missing NOTION_TOKEN"); return; }

  const writer = new NotionApiWriter(token);
  const rootName = process.env.NOTION_ROOT_PAGE_NAME ?? "Finance note";
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const { yearPage, monthPage } = await ensureMonthlyHierarchy(writer, rootName, year, month);

  const monthStr = `${year}-${String(month).padStart(2, "0")}`;
  const txs = db.prepare("SELECT * FROM canonical_transactions WHERE month = ?").all(monthStr) as any[];

  if (txs.length === 0) {
    console.log("  No transactions this month");
    return;
  }

  const mappedTxs = txs.map((r: any) => ({ ...r, needs_review: r.needs_review === 1 })) as CanonicalTransaction[];
  await writer.updateMonthlySummary(monthPage.id, mappedTxs);

  const reviewTxs = mappedTxs.filter((t: any) => t.needs_review || t.actual_sync_status === "needs_review");
  if (reviewTxs.length > 0) await writer.updateNeedsReviewSection(monthPage.id, reviewTxs);

  const failedTxs = mappedTxs.filter((t: any) => t.actual_sync_status === "sync_failed");
  if (failedTxs.length > 0) await writer.updateSyncFailureSection(monthPage.id, failedTxs);

  console.log("  Updated Notion");
}

main().catch((err) => {
  console.error("Error:", err.message || err);
  process.exit(1);
});
