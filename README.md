# AI-Powered Personal Budget

An AI ingestion, extraction, validation, deduplication, and sync layer around [Actual Budget](https://actualbudget.org/).

Captures messy real-world spending events from emails, phone notifications, and manual input, normalizes them into validated multi-currency transactions, and syncs them into Actual Budget. Optional monthly summaries in Notion.

## Architecture

```
Messy payment messages in
  -> raw event storage
  -> universal extractor (rule-based + AI fallback)
  -> validation
  -> deduplication
  -> canonical transaction
  -> Actual Budget sync
  -> optional Notion monthly summary
```

Primary destination: **Actual Budget**. This is not a replacement for Actual Budget — it is an ingestion and sync layer on top.

## Setup

```bash
pnpm install
cp .env.example .env   # edit with your values
```

## Commands

```bash
pnpm test          # run tests
pnpm lint          # lint code
pnpm typecheck     # check types
```

## Packages

- `packages/core` — Shared types (RawEvent, CanonicalTransaction, etc.)

## MVP Flow

1. Manual input captured as raw event
2. Raw event converted to canonical transaction
3. Validation and deduplication
4. Sync to Actual Budget (mock in Phase 1)
5. Notion monthly summary update (mock in Phase 1)

## License

MIT
