import type { CanonicalTransaction, ActualSyncStatus } from "@ai-budget/core";
import type { ActualBudgetAdapter } from "./types.js";

export interface SyncInput {
  transactions: CanonicalTransaction[];
  adapter: ActualBudgetAdapter;
  useDryRun?: boolean;
}

export interface SyncResult {
  synced: string[];
  failed: { transaction_id: string; error: string }[];
  skipped: string[];
}

export async function syncTransactions(
  input: SyncInput,
): Promise<SyncResult> {
  const result: SyncResult = { synced: [], failed: [], skipped: [] };

  for (const tx of input.transactions) {
    if (tx.needs_review) {
      result.skipped.push(tx.transaction_id);
      continue;
    }

    if (tx.duplicate_status !== "unique") {
      result.skipped.push(tx.transaction_id);
      continue;
    }

    const importResult = await input.adapter.importTransaction(tx);

    if (importResult.success && importResult.actual_transaction_id) {
      tx.actual_transaction_id = importResult.actual_transaction_id;
      tx.actual_sync_status = "synced" as ActualSyncStatus;
      result.synced.push(tx.transaction_id);
    } else {
      tx.actual_sync_status = "sync_failed" as ActualSyncStatus;
      result.failed.push({
        transaction_id: tx.transaction_id,
        error: importResult.error_message ?? "Unknown error",
      });
    }
  }

  return result;
}
