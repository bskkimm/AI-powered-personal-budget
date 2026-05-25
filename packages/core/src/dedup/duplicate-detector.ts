import type { CanonicalTransaction, DuplicateStatus } from "../schemas/canonical-transaction.js";
import type { RawEvent } from "../schemas/raw-event.js";

export interface DuplicateCheckInput {
  currentTransaction: CanonicalTransaction;
  existingTransactions: CanonicalTransaction[];
  existingEvents: RawEvent[];
}

export interface DuplicateResult {
  status: DuplicateStatus;
  matchedTransactionId: string | null;
  reasons: string[];
}

export function detectDuplicates(input: DuplicateCheckInput): DuplicateResult {
  const reasons: string[] = [];
  const tx = input.currentTransaction;

  for (const event of input.existingEvents) {
    if (
      tx.raw_event_id === event.raw_event_id
    ) {
      return {
        status: "duplicate",
        matchedTransactionId: null,
        reasons: [`Same raw_event_id: ${event.raw_event_id}`],
      };
    }
  }

  for (const existing of input.existingTransactions) {
    if (existing.transaction_id === tx.transaction_id) {
      return {
        status: "duplicate",
        matchedTransactionId: existing.transaction_id,
        reasons: ["Same transaction_id"],
      };
    }

    const sameAmount =
      tx.amount_value !== null &&
      existing.amount_value !== null &&
      tx.amount_value === existing.amount_value;

    const sameCurrency =
      tx.currency !== null &&
      existing.currency !== null &&
      tx.currency === existing.currency;

    const sameDate =
      tx.date !== null &&
      existing.date !== null &&
      tx.date === existing.date;

    const sameMerchant =
      tx.merchant !== null &&
      existing.merchant !== null &&
      tx.merchant.toLowerCase() === existing.merchant.toLowerCase();

    const samePlatform =
      tx.payment_platform !== null &&
      existing.payment_platform !== null &&
      tx.payment_platform.toLowerCase() === existing.payment_platform.toLowerCase();

    const exactMatch =
      sameAmount && sameCurrency && sameDate && sameMerchant;
    if (exactMatch) {
      reasons.push(
        `Exact match found: amount=${tx.amount_value}, currency=${tx.currency}, date=${tx.date}, merchant=${tx.merchant}`,
      );
    }

    const amountAndDateMatch =
      sameAmount && sameCurrency && sameDate && tx.merchant === null &&
      existing.merchant === null;
    if (amountAndDateMatch) {
      reasons.push(
        `Amount+date match (no merchant): amount=${tx.amount_value}, currency=${tx.currency}, date=${tx.date}`,
      );
    }

    const platformAndAmountMatch =
      sameAmount && sameCurrency && samePlatform &&
      tx.date !== null && existing.date !== null &&
      Math.abs(
        new Date(tx.date).getTime() - new Date(existing.date).getTime(),
      ) < 86400000;
    if (platformAndAmountMatch) {
      reasons.push(
        `Platform+amount+nearby date match: amount=${tx.amount_value}, platform=${tx.payment_platform}`,
      );
    }
  }

  if (reasons.length > 0) {
    return {
      status: "possible_duplicate",
      matchedTransactionId: null,
      reasons,
    };
  }

  return {
    status: "unique",
    matchedTransactionId: null,
    reasons: [],
  };
}
