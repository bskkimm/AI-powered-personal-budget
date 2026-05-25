import type { SourceChannel } from "./raw-event.js";

export interface ExtractionResult {
  datetime: string | null;
  amount_value: number | null;
  currency: string | null;
  display_amount: string | null;

  merchant: string | null;
  country: string | null;
  payment_platform: string | null;
  payment_method: string | null;

  transaction_type: "expense" | "income" | "transfer" | null;

  category: string | null;
  subcategory: string | null;
  memo: string | null;

  location: string | null;
  balance_after: number | null;
  card_last4: string | null;

  source_channel: SourceChannel;
  source_name: string | null;

  actual_account_id: string | null;
  actual_category_id: string | null;

  needs_review: boolean;

  confidence: {
    datetime: number;
    amount: number;
    currency: number;
    merchant: number;
    category: number;
    account_mapping: number;
  };
}
