import type { CanonicalTransaction } from "../schemas/canonical-transaction.js";
import type { ValidationResult } from "../validation/validate-transaction.js";

export interface ReviewQueueItem {
  transaction_id: string;
  raw_event_id: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export function buildReviewQueueItem(
  tx: CanonicalTransaction,
  validation: ValidationResult,
): ReviewQueueItem | null {
  const reasons: string[] = [];

  if (tx.needs_review) {
    reasons.push("needs_review is true");
  }
  for (const err of validation.errors) {
    reasons.push(err);
  }
  for (const warn of validation.warnings) {
    reasons.push(`warning: ${warn}`);
  }
  if (tx.merchant === null) {
    reasons.push("merchant is missing");
  }
  if (tx.category === null && tx.actual_category_name !== "Uncategorized") {
    reasons.push("category is missing");
  }
  if (
    tx.actual_account_id === null &&
    tx.actual_account_name === null
  ) {
    reasons.push("account mapping is missing");
  }
  if (tx.confidence_score < 0.5) {
    reasons.push(`confidence score too low: ${tx.confidence_score}`);
  }

  if (reasons.length === 0) return null;

  return {
    transaction_id: tx.transaction_id,
    raw_event_id: tx.raw_event_id,
    reason: reasons.join("; "),
    status: "pending",
    created_at: new Date().toISOString(),
  };
}
