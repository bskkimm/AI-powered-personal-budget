# Actual Budget Integration

## Strategy

Actual Budget is the primary destination for validated transactions. Integration uses the official `@actual-app/api` Node.js package — Actual Budget does not expose a REST API for this use case.

## Connection

The adapter connects to a local or server-hosted Actual Budget instance using:

- `ACTUAL_SERVER_URL` — server URL
- `ACTUAL_PASSWORD` — budget file password (if encrypted)
- `ACTUAL_BUDGET_ID` — budget file sync ID
- `ACTUAL_DATA_DIR` — local data directory for the budget file

## Mapping

Canonical transactions are mapped to Actual Budget fields:

| Canonical Field | Actual Budget Field |
|----------------|---------------------|
| `amount_value` + `currency` | Transaction amount |
| `datetime` / `date` | Transaction date |
| `merchant` | Payee |
| `category` / `subcategory` | Category |
| `payment_method` / `payment_platform` | Account |
| `memo` + `raw_event_id` | Notes / import ID |
| `transaction_id` | Internal import ID |

## Sync Rules

- Only sync transactions where `needs_review` is `false`
- Only sync transactions where `duplicate_status` is `unique`
- Only sync when `actual_account_id` is set
- Store `actual_transaction_id` after successful sync
- Mark `actual_sync_status` as `sync_failed` with error details on failure
- Never silently overwrite existing Actual Budget transactions

## Account Mapping Examples

| Source | Actual Budget Account |
|--------|----------------------|
| PayPay notification | PayPay |
| SMBC email | SMBC Card |
| Cash JPY manual | Cash JPY |
| Cash KRW manual | Cash KRW |
| Unknown | `needs_review` |

## Category Mapping Examples

| Merchant | Category |
|----------|----------|
| FamilyMart / CU | Convenience Store |
| Starbucks | Cafe |
| Train / Suica / subway | Transport |
| Mercari | Shopping |
| Unknown | Uncategorized or `needs_review` |
