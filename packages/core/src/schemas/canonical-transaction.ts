import type { SourceChannel } from "./raw-event.js";

export type TransactionType = "expense" | "income" | "transfer";

export type DuplicateStatus = "unique" | "possible_duplicate" | "duplicate";

export type ActualSyncStatus =
  | "not_synced"
  | "synced"
  | "sync_failed"
  | "needs_review"
  | "possible_duplicate";

export interface CanonicalTransaction {
  transaction_id: string;
  raw_event_id: string;

  datetime: string | null;
  date: string | null;
  month: string | null;

  country: string | null;

  amount_value: number | null;
  currency: string | null;
  display_amount: string | null;

  merchant: string | null;
  payment_platform: string | null;
  payment_method: string | null;

  transaction_type: TransactionType | null;

  category: string | null;
  subcategory: string | null;

  actual_account_id: string | null;
  actual_account_name: string | null;
  actual_category_id: string | null;
  actual_category_name: string | null;

  source_channel: SourceChannel;
  source_name: string | null;
  auto_or_manual: "auto" | "manual";

  needs_review: boolean;
  confidence_score: number;

  memo: string | null;
  raw_text: string | null;

  duplicate_status: DuplicateStatus;
  actual_sync_status: ActualSyncStatus;
  actual_transaction_id: string | null;

  created_at: string;
  updated_at: string;
}
