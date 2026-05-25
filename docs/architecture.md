# Architecture

## Overview

AI-Powered Personal Budget is an ingestion and sync layer that sits on top of Actual Budget. It captures spending events from multiple sources, normalizes them, and syncs validated transactions into Actual Budget.

## Pipeline

```
Email / Notification / Manual Input
        │
        ▼
   Raw Event Store        ← never modified after creation
        │
        ▼
  Universal Extractor     ← rule-based → AI fallback
        │
        ▼
    Validation             ← schema + business rules
        │
        ▼
   Deduplication           ← local DB + Actual Budget
        │
        ▼
 Canonical Transaction     ← independent of Actual/Notion
        │
        ▼
  Actual Budget Sync       ← validated only
        │
        ▼
  Notion Monthly Summary   ← optional, read-only
```

## Module Boundaries

| Module | Responsibility |
|--------|---------------|
| `packages/collectors` | Source input (email, notification, webhook) |
| `packages/extractor` | Raw event → extraction result |
| `packages/core` | Validation, dedup, shared types |
| `apps/actual-adapter` | Canonical → Actual Budget transaction |
| `packages/notion-writer` | Monthly summaries and review sections |

## Key Design Decisions

- SQLite as the local database
- Amount and currency stored separately (never combined strings)
- `needs_review` and `possible_duplicate` block automatic sync
- Raw events are immutable and preserved for audit
- Notion is read-only output; Actual Budget is the source of truth
