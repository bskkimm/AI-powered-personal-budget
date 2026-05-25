import type { RawEvent, ExtractionResult } from "@ai-budget/core";

export interface AiExtractor {
  extract(event: RawEvent): Promise<ExtractionResult>;
}

const MOCK_AI_RESULT: ExtractionResult = {
  datetime: null,
  amount_value: null,
  currency: null,
  display_amount: null,
  merchant: null,
  country: null,
  payment_platform: null,
  payment_method: null,
  transaction_type: null,
  category: null,
  subcategory: null,
  memo: null,
  location: null,
  balance_after: null,
  card_last4: null,
  source_channel: "phone_notification",
  source_name: null,
  actual_account_id: null,
  actual_category_id: null,
  needs_review: true,
  confidence: {
    datetime: 0,
    amount: 0,
    currency: 0,
    merchant: 0,
    category: 0,
    account_mapping: 0,
  },
};

export class AiExtractorPlaceholder implements AiExtractor {
  async extract(event: RawEvent): Promise<ExtractionResult> {
    void event;
    return { ...MOCK_AI_RESULT };
  }
}
