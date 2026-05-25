# Actual Budget Integration

## Strategy

Actual Budget is the primary destination for validated transactions. Integration uses the official `@actual-app/api` Node.js package — Actual Budget does not expose an HTTP/REST API. The API client runs headless, connecting to the server only to download/upload budget files; all data operations happen locally against a cached SQLite file.

## Connection

```typescript
import api from "@actual-app/api";

await api.init({
  dataDir: process.env.ACTUAL_DATA_DIR,
  serverURL: process.env.ACTUAL_SERVER_URL,
  password: process.env.ACTUAL_PASSWORD,
});

await api.downloadBudget(process.env.ACTUAL_BUDGET_ID);

// ... do work ...

await api.shutdown();
```

### Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `ACTUAL_SERVER_URL` | Server URL (e.g. `http://localhost:5006`) | Yes |
| `ACTUAL_PASSWORD` | Server password | Yes |
| `ACTUAL_BUDGET_ID` | Budget file Sync ID (Settings → Advanced → Sync ID) | Yes |
| `ACTUAL_DATA_DIR` | Local cache directory for budget files | Yes |

### TypeScript Notes

`@actual-app/api` ships TypeScript declarations. `tsconfig.json` must use `moduleResolution: "bundler"` or `"nodenext"`. Legacy `"node"` resolution is not supported.

### Connection Lifecycle

1. `api.init(config)` — connects to server, loads budget data
2. `api.downloadBudget(syncId, options?)` — downloads/opens the budget file. If encrypted, pass `{ password }` in options.
3. `api.shutdown()` — closes budget, cleans up. Call before exiting.

Without `serverURL`, the API works fully offline against locally cached budget files.

## Loading Accounts and Categories

```typescript
const accounts = await api.getAccounts();
// Returns: Array<{ id: string, name: string, offbudget?: boolean, closed?: boolean }>

const categories = await api.getCategories();
// Returns: Array<{ id: string, name: string, group_id: string, is_income?: boolean }>

const payees = await api.getPayees();
// Returns: Array<{ id: string, name: string, transfer_acct?: string, category?: string }>
```

Transfer payees have a `transfer_acct` field pointing to the target account ID. These are used for inter-account transfers.

### Utility: getIDByName

```typescript
// Look up ID by name for accounts, categories, payees, or schedules
const accountId = await api.getIDByName("accounts", "Cash JPY");
```

## Transaction Import

### Method: `importTransactions`

```typescript
const result = await api.importTransactions(accountId, transactions, {
  defaultCleared: false,
  reimportDeleted: false,
});
// Returns: { errors: string[], added: string[], updated: string[] }
```

This is the **preferred** method (over `addTransactions`) because it:

1. Runs Actual Budget's rule engine on incoming transactions
2. Reconciles against existing transactions to avoid duplicates
3. Processes transfer payees to create inter-account transfers
4. Supports `dryRun: true` to preview without committing

### Transaction Shape

```typescript
{
  account: string;        // account ID (UUID)
  date: string;           // "YYYY-MM-DD"
  amount: number;         // integer: value * 100 for most currencies
                          // JPY/KRW: no decimal, so 680 JPY = 680
  payee_name?: string;    // auto-creates payee if new, matches existing by name
  payee?: string;         // payee ID (UUID), overrides payee_name if both given
  imported_payee?: string;// raw description from source (for user reference)
  category?: string;      // category ID (UUID)
  notes?: string;         // free-text notes
  imported_id?: string;   // unique ID for deduplication
  cleared?: boolean;      // whether transaction is cleared (default: true)
}
```

### Amount Handling

Actual stores amounts as integers. The multiplier depends on currency:

| Currency | Example | Integer |
|----------|---------|---------|
| JPY | ¥680 | 680 |
| KRW | ₩7,000 | 7000 |
| USD | $12.30 | 1230 |

Use `api.utils.amountToInteger()` and `api.utils.integerToAmount()` for conversion when sub-decimal precision exists. For JPY/KRW, the amount is already an integer since these currencies have no sub-decimal units.

## Deduplication and Reconciliation

`importTransactions` handles deduplication in two ways:

1. **`imported_id`**: Transactions with the same `imported_id` will **never** be added more than once. Use `canonical_transaction.transaction_id` as `imported_id` to prevent duplicate imports.

2. **Fuzzy matching**: If no `imported_id` match exists, Actual matches by amount, date proximity, and payee similarity to detect and skip likely duplicates.

3. **`reimportDeleted`**: Controls whether previously-imported-then-deleted transactions should be reimported. Set to `false` to respect deletions.

### Our Strategy

- Set `imported_id = transaction_id` on every import
- This guarantees idempotency: running the same pipeline twice won't create duplicates
- Store `actual_transaction_id` (the returned `added[]` UUID) after successful import
- Use `dryRun: true` for pre-flight validation

## Mapping (Canonical → Actual)

| Canonical Field | Actual Budget Field | Notes |
|----------------|---------------------|-------|
| `date` / `datetime` | `date` | `YYYY-MM-DD` format |
| `merchant` | `payee_name` | Auto-creates payee if new |
| `actual_account_name` | account lookup | Resolve name → UUID via `getIDByName` |
| `actual_category_name` / `category` | category lookup | Resolve name → UUID via `getIDByName` |
| `amount_value` | `amount` | Integer; no conversion needed for JPY/KRW |
| `memo` + `raw_event_id` + `transaction_id` | `notes` | Joined with pipes |
| `transaction_id` | `imported_id` | Critical for deduplication |
| `display_amount` | `imported_payee` | Raw description for user reference |
| — | `cleared` | `false` by default |

## Sync Rules

- Only sync when `needs_review` is `false`
- Only sync when `duplicate_status` is `unique`
- Only sync when `actual_account_name` or `actual_account_id` is set
- Run `getIDByName("accounts", accountName)` to resolve account UUID before import
- If account or category name lookup fails, mark `sync_failed` with the error
- Store the returned Actual transaction UUID as `actual_transaction_id`
- Never overwrite or delete existing Actual Budget transactions programmatically

## Implementation Plan

### Phase A: Basic Sync (next step)

1. Install `@actual-app/api` as a dependency
2. Create `ActualBudgetAdapter` production implementation wrapping the API client
3. Resolve account/category names to UUIDs at import time
4. Map `CanonicalTransaction` → Actual transaction shape
5. Call `importTransactions` with the mapped transactions
6. Store returned UUIDs in `actual_transaction_id`

### Phase B: Robustness

1. Pre-flight `dryRun` to detect issues before committing
2. Batch imports per account
3. Handle `errors[]` in the import result
4. Retry logic for connection failures

### Phase C: Reconciliation

1. Compare local `canonical_transactions` against Actual transactions
2. Detect mismatches (amount changed, deleted from Actual, etc.)
3. Update `actual_sync_status` accordingly

## Risks and Unknowns

| Risk | Mitigation |
|------|------------|
| **Amount integer format varies by currency** | JPY/KRW have no sub-decimal; test with real budget before relying on `amountToInteger` |
| **Account/category name must match exactly** | Use `getIDByName` with exact names; log failures clearly |
| **Payee auto-creation may create noise** | Always set `imported_payee` to preserve the raw source description |
| **Server connection required for initial download** | After download, budget is cached locally; offline mode works for subsequent import |
| **`importTransactions` runs rules** | Test with Actual's rule engine; may modify category/payee unexpectedly |
| **Encrypted budgets need password** | Support `ACTUAL_FILE_PASSWORD` env var for `downloadBudget` options |
| **API version compatibility** | Pin `@actual-app/api` version and test upgrades |
| **No HTTP API** | All access is via the Node.js package; must run in-process |
