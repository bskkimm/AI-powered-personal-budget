import type { CanonicalTransaction } from "@ai-budget/core";
import type { ActualTransaction } from "./types.js";

export function mapCanonicalToActual(
  tx: CanonicalTransaction,
): ActualTransaction {
  const date =
    tx.date ??
    (tx.datetime ? tx.datetime.slice(0, 10) : new Date().toISOString().slice(0, 10));

  const account =
    tx.actual_account_name ?? tx.actual_account_id ?? "Uncategorized";

  const category =
    tx.actual_category_name ?? tx.category ?? "Uncategorized";

  const payee = tx.merchant;

  const amount = tx.amount_value ?? 0;

  const notes = [
    tx.memo,
    `raw_event_id=${tx.raw_event_id}`,
    `transaction_id=${tx.transaction_id}`,
    tx.display_amount ? `display=${tx.display_amount}` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  return {
    date,
    account,
    payee,
    category,
    amount,
    notes,
    import_id: tx.transaction_id,
    cleared: false,
  };
}
