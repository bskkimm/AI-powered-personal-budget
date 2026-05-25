import type { CanonicalTransaction } from "../schemas/canonical-transaction.js";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  needs_review: boolean;
}

export function validateTransaction(
  tx: CanonicalTransaction,
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let needsReview = tx.needs_review;

  if (tx.amount_value === null || tx.amount_value === undefined) {
    errors.push("amount_value is missing");
  } else if (typeof tx.amount_value !== "number" || isNaN(tx.amount_value)) {
    errors.push("amount_value must be a valid number");
  }

  if (tx.currency === null || tx.currency === undefined) {
    errors.push("currency is missing");
  }

  if (
    (tx.actual_account_id === null || tx.actual_account_id === undefined) &&
    (tx.actual_account_name === null || tx.actual_account_name === undefined)
  ) {
    errors.push(
      "actual_account_id and actual_account_name are both missing",
    );
  }

  if (tx.duplicate_status === "possible_duplicate") {
    errors.push("duplicate_status is possible_duplicate");
  }

  if (tx.duplicate_status === "duplicate") {
    errors.push("duplicate_status is duplicate");
  }

  if (tx.needs_review) {
    errors.push("needs_review is true");
  }

  if (tx.merchant === null || tx.merchant === undefined) {
    warnings.push("merchant is missing");
    needsReview = true;
  }

  if (tx.category === null || tx.category === undefined) {
    warnings.push("category is missing");
    if (!isUncategorized(tx)) {
      needsReview = true;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    needs_review: needsReview,
  };
}

function isUncategorized(tx: CanonicalTransaction): boolean {
  return (
    tx.category === "Uncategorized" ||
    tx.actual_category_name === "Uncategorized"
  );
}
