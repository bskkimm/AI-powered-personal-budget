import type { CanonicalTransaction } from "@ai-budget/core";

export interface ActualAccount {
  id: string;
  name: string;
}

export interface ActualCategory {
  id: string;
  name: string;
}

export interface ActualTransaction {
  date: string;
  account: string;
  payee: string | null;
  category: string | null;
  amount: number;
  notes: string | null;
  import_id: string;
  cleared: boolean;
}

export interface ImportResult {
  success: boolean;
  actual_transaction_id: string | null;
  error_message: string | null;
}

export interface ActualBudgetAdapter {
  loadAccounts(): Promise<ActualAccount[]>;
  loadCategories(): Promise<ActualCategory[]>;
  importTransaction(tx: CanonicalTransaction): Promise<ImportResult>;
  findPotentialDuplicates(tx: CanonicalTransaction): Promise<string[]>;
}
