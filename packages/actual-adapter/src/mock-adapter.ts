import type { CanonicalTransaction } from "@ai-budget/core";
import type {
  ActualAccount,
  ActualCategory,
  ImportResult,
  ActualBudgetAdapter,
} from "./types.js";

const MOCK_ACCOUNTS: ActualAccount[] = [
  { id: "acc_paypay", name: "PayPay" },
  { id: "acc_smbc", name: "SMBC Card" },
  { id: "acc_cash_jpy", name: "Cash JPY" },
  { id: "acc_cash_krw", name: "Cash KRW" },
];

const MOCK_CATEGORIES: ActualCategory[] = [
  { id: "cat_convenience", name: "Convenience Store" },
  { id: "cat_cafe", name: "Cafe" },
  { id: "cat_transport", name: "Transport" },
  { id: "cat_shopping", name: "Shopping" },
  { id: "cat_uncategorized", name: "Uncategorized" },
];

let nextId = 0;

export class MockActualAdapter implements ActualBudgetAdapter {
  private imported: Map<string, string> = new Map();

  async loadAccounts(): Promise<ActualAccount[]> {
    return [...MOCK_ACCOUNTS];
  }

  async loadCategories(): Promise<ActualCategory[]> {
    return [...MOCK_CATEGORIES];
  }

  async importTransaction(tx: CanonicalTransaction): Promise<ImportResult> {
    if (tx.needs_review) {
      return {
        success: false,
        actual_transaction_id: null,
        error_message: "Transaction needs review. Cannot sync.",
      };
    }

    if (tx.duplicate_status === "possible_duplicate") {
      return {
        success: false,
        actual_transaction_id: null,
        error_message: "Transaction is a possible duplicate. Cannot sync.",
      };
    }

    if (tx.duplicate_status === "duplicate") {
      return {
        success: false,
        actual_transaction_id: null,
        error_message: "Transaction is a confirmed duplicate. Cannot sync.",
      };
    }

    if (!tx.actual_account_id && !tx.actual_account_name) {
      return {
        success: false,
        actual_transaction_id: null,
        error_message: "No account mapping. Cannot sync.",
      };
    }

    const id = `actual_tx_${String(++nextId).padStart(4, "0")}`;
    this.imported.set(tx.transaction_id, id);

    return {
      success: true,
      actual_transaction_id: id,
      error_message: null,
    };
  }

  async findPotentialDuplicates(
    _tx: CanonicalTransaction,
  ): Promise<string[]> {
    void _tx;
    return [];
  }
}
