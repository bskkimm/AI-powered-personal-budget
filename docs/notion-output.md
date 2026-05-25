# Notion Output

## Strategy

Notion is a read-only monthly summary layer — not a primary ledger. Actual Budget is the source of truth for financial data.

## Hierarchy

```
Fiance note
└── 2026
    └── May
        ├── Monthly Summary
        ├── Daily Summary View
        ├── Category Summary
        ├── Payment Method Summary
        ├── Needs Review Transactions
        ├── Possible Duplicates
        ├── Recent Synced Transactions
        └── Sync Failures
```

## Rules

- **Do not rename** "Fiance note" to "Finance note" unless the user asks
- **Do not create daily child pages** (e.g., "May 1", "May 2")
- Find or create the year page under the root
- Find or create the month page under the year
- Summaries group by currency first (JPY, KRW)
- All content on the month page — no child page proliferation

## Sections on Month Page

| Section | Content |
|---------|---------|
| Monthly Summary | Total spending by currency, income, net |
| Daily Summary View | Spending by day, grouped by currency |
| Category Summary | Spending by category, grouped by currency |
| Payment Method Summary | Spending by payment method/account |
| Needs Review Transactions | List of transactions marked `needs_review` |
| Possible Duplicates | List of flagged duplicates |
| Recent Synced Transactions | Last N transactions synced to Actual Budget |
| Sync Failures | Failed sync attempts with error messages |
