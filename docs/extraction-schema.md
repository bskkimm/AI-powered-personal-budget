# Extraction Schema

## Universal Extractor Contract

The universal extractor converts a raw event into an extraction result. It uses rule-based extraction first, then falls back to AI extraction if rules don't match.

## Extraction Result Shape

```typescript
interface ExtractionResult {
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
```

## Rules

- Never hallucinate financial data — use `null` when uncertain
- `amount_value` and `currency` are separate fields (never combined strings)
- If merchant is unknown, leave as `null` and set `needs_review = true`
- Missing amount or currency blocks sync
- Confidence scores must reflect actual uncertainty

## Fixture Expected Outputs

### PayPay FamilyMart JPY
- `amount_value`: 680, `currency`: JPY
- `merchant`: FamilyMart, `payment_platform`: PayPay
- `country`: JP, `needs_review`: false

### Korean Unknown KRW
- `amount_value`: 12000, `currency`: KRW
- `merchant`: null, `category`: null
- `needs_review`: true

### SMBC Starbucks JPY
- `amount_value`: 520, `currency`: JPY
- `merchant`: Starbucks, `payment_method`: SMBC Card
- `category`: Cafe (if mapping exists)

### Manual CU Cash KRW
- `amount_value`: 7000, `currency`: KRW
- `merchant`: CU, `actual_account_name`: Cash KRW
- `needs_review`: false
