import type {
  ActualAccount,
  ActualCategory,
  ImportResult,
  ActualBudgetAdapter,
} from "./types.js";
import type { CanonicalTransaction } from "@ai-budget/core";
import { mapCanonicalToActual } from "./mapper.js";
import api from "@actual-app/api";

export interface ActualAdapterConfig {
  serverURL: string;
  password: string;
  budgetId: string;
  dataDir: string;
  filePassword?: string;
}

export class ActualBudgetApiAdapter implements ActualBudgetAdapter {
  private connected = false;

  constructor(private config: ActualAdapterConfig) {}

  async connect(): Promise<void> {
    if (this.config.serverURL) {
      await api.init({
        serverURL: this.config.serverURL,
        password: this.config.password,
        dataDir: this.config.dataDir,
      });
      await api.downloadBudget(this.config.budgetId, {
        password: this.config.filePassword,
      });
    } else {
      await api.init({
        dataDir: this.config.dataDir,
      });
      try {
        await api.loadBudget(this.config.budgetId);
      } catch {
        const budgets = await api.getBudgets();
        if (budgets.length > 0) {
          const id = "id" in budgets[0] ? (budgets[0] as any).id : (budgets[0] as any).cloudFileId;
          if (id) await api.loadBudget(id);
        }
      }
    }
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    try {
      await api.shutdown();
    } catch {
      // ignore shutdown errors
    }
    this.connected = false;
  }

  private ensureConnected(): void {
    if (!this.connected) {
      throw new Error("Not connected to Actual Budget. Call connect() first.");
    }
  }

  async loadAccounts(): Promise<ActualAccount[]> {
    this.ensureConnected();
    const accounts = await api.getAccounts();
    return accounts.map((a) => ({ id: a.id, name: a.name }));
  }

  async loadCategories(): Promise<ActualCategory[]> {
    this.ensureConnected();
    const categories = await api.getCategories();
    return categories
      .filter((c) => "name" in c && !("categories" in c))
      .map((c) => ({ id: c.id, name: c.name }));
  }

  async importTransaction(tx: CanonicalTransaction): Promise<ImportResult> {
    this.ensureConnected();

    if (tx.needs_review) {
      return {
        success: false,
        actual_transaction_id: null,
        error_message: "Transaction needs review. Cannot sync.",
      };
    }

    if (tx.duplicate_status !== "unique") {
      return {
        success: false,
        actual_transaction_id: null,
        error_message: `Transaction is ${tx.duplicate_status}. Cannot sync.`,
      };
    }

    if (!tx.actual_account_name && !tx.actual_account_id) {
      return {
        success: false,
        actual_transaction_id: null,
        error_message: "No account mapping. Cannot sync.",
      };
    }

    try {
      const accountName = tx.actual_account_name ?? tx.actual_account_id!;
      const accountId = await api.getIDByName("accounts", accountName);

      const mapped = mapCanonicalToActual(tx);

      const result = await api.importTransactions(
        accountId,
        [
          {
            account: accountId,
            date: mapped.date,
            amount: mapped.amount,
            payee_name: mapped.payee ?? undefined,
            category: mapped.category !== "Uncategorized" ? undefined : undefined,
            notes: mapped.notes ?? undefined,
            imported_id: mapped.import_id,
            cleared: mapped.cleared,
            imported_payee: tx.display_amount ?? undefined,
          },
        ],
        {
          defaultCleared: false,
          reimportDeleted: false,
        },
      );

      if (result.errors.length > 0) {
        return {
          success: false,
          actual_transaction_id: null,
          error_message: result.errors.map((e) => e.message).join("; "),
        };
      }

      const addedId = result.added[0] ?? null;

      return {
        success: true,
        actual_transaction_id: addedId,
        error_message: null,
      };
    } catch (err) {
      return {
        success: false,
        actual_transaction_id: null,
        error_message: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }

  async findPotentialDuplicates(
    _tx: CanonicalTransaction,
  ): Promise<string[]> {
    void _tx;
    this.ensureConnected();
    return [];
  }
}
