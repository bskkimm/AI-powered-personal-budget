# AGENTS.md

## Project

AI-powered-personal-budget

Local repository:

    ~/workspace/AI-powered-personal-budget

This repository is an AI ingestion, extraction, validation, deduplication, and sync layer around Actual Budget.

It is not a replacement for Actual Budget.

## Required Context Reading Order

When starting work in this repository, the agent must read context in this order:

1. Read local AGENTS.md first.
2. Read README.md if it exists.
3. Read the Notion product specification page.
4. Read relevant docs in docs/ if they exist.
5. Inspect the current file tree before editing.

The Notion page is the current product specification. AGENTS.md is the local engineering contract.

Current Notion product spec:

    https://www.notion.so/AI-Personal-Finance-Note-36ab4c6e67a18038ae2adc6ce034ea7c

If AGENTS.md and the Notion page conflict:

- AGENTS.md wins for safety, repo hygiene, security, testing, and implementation discipline.
- The Notion page wins for current product direction and feature requirements.
- If the conflict affects architecture, ask the user before making large changes.

## Upstream Actual Budget References

This project builds on top of Actual Budget.

Official Actual Budget website:

    https://actualbudget.org/

Official Actual Budget GitHub repository:

    https://github.com/actualbudget/actual

Official Actual Budget API documentation:

    https://actualbudget.org/docs/api/

Official API package:

    @actual-app/api

Important Actual Budget API facts:

- Actual Budget does not expose a normal HTTP/REST API for this project to rely on.
- Programmatic integration should use the official Node.js package @actual-app/api.
- Other languages are not officially supported for the API.
- The API is intended for custom importers, exporters, and programmatic interaction with Actual data.

Implication for this project:

- Prefer TypeScript/Node.js for the Actual Budget adapter.
- Do not design the Actual adapter as if Actual exposes REST endpoints.
- Do not modify or fork Actual Budget core during the MVP.
- Build this repository as an external ingestion and sync layer.

## Mission

Build an AI-powered personal budget extension layer on top of Actual Budget.

The system captures messy real-world spending events from:

- Email payment notifications
- Android phone notifications
- Manual cash/spending input
- Corrections or missing transactions

Then it converts them into clean, validated, multi-currency transactions and syncs them into Actual Budget.

Optional secondary output:

- Monthly Notion finance summaries

Core flow:

    Any spending event
    -> raw event storage
    -> universal extractor
    -> validation
    -> deduplication
    -> canonical transaction
    -> Actual Budget sync
    -> optional Notion monthly summary

Primary destination:

    Actual Budget

Secondary note/dashboard destination:

    Notion monthly finance note

Target countries/currencies:

    Japan: JPY
    Korea: KRW
    Future: currency-agnostic design

## Most Important Product Rule

Do not build a new finance app.

Do not fork or modify Actual Budget core during the MVP unless explicitly requested.

This repo should be an external integration layer.

Correct mental model:

    Actual Budget = finance app / budget UI / clean transaction store
    AI-powered-personal-budget = ingestion + extraction + validation + sync layer
    Notion = readable monthly summary layer

Good MVP:

    AI-powered-personal-budget
    -> Actual Budget API/library adapter
    -> Actual Budget budget file

Avoid:

    Fork Actual Budget
    -> modify core app
    -> maintain custom finance app fork

## Non-Negotiable Rules

### Do not hallucinate financial data

Never invent:

- amount
- currency
- merchant
- date
- account
- category
- payment method

If a field is unavailable, use null or mark the transaction as needs_review.

Example:

    Input:
    결제가 완료되었습니다. 12,000원

    Valid extraction:
    amount_value = 12000
    currency = KRW
    merchant = null
    category = null
    needs_review = true
    sync_to_actual = false

Do not guess the merchant or category.

### Never sync uncertain transactions automatically

Do not sync into Actual Budget when:

- amount is missing
- currency is missing and cannot be safely inferred
- Actual Budget account mapping is missing
- duplicate_status is possible_duplicate
- needs_review is true, unless the user explicitly approves

### Preserve raw events

Always store raw input before extraction.

Raw events are required for:

- debugging
- reprocessing
- deduplication
- source traceability
- preventing duplicate Actual Budget sync

### Do not create daily Notion child pages

The existing Notion hierarchy must be preserved:

    Fiance note
    └── 2026
        └── May

Important:

    The top page may really be named "Fiance note".
    Do not rename it to "Finance note" unless the user explicitly asks.

Correct Notion structure:

    Fiance note
    └── Year page
        └── Month page
            ├── Monthly Summary
            ├── Daily Summary View
            ├── Category Summary
            ├── Payment Method Summary
            ├── Needs Review Transactions
            └── Recent Synced Transactions

Wrong:

    May
    ├── May 1 page
    ├── May 2 page
    ├── May 3 page

### Keep amount and currency separate

Do not store only:

    "¥680"
    "₩7,000"

Always store:

    amount_value = number
    currency = ISO currency code
    display_amount = human-readable string

Examples:

    {
      "amount_value": 680,
      "currency": "JPY",
      "display_amount": "¥680"
    }

    {
      "amount_value": 7000,
      "currency": "KRW",
      "display_amount": "₩7,000"
    }

## Agent Operating Procedure

Every coding agent working on this repo must follow this workflow.

### Step 1: Inspect first

Before editing, inspect:

    pwd
    ls
    find . -maxdepth 3 -type f | sort

If the repo is empty, bootstrap only the minimum project structure needed for the current task.

Do not create a huge architecture all at once unless explicitly asked.

### Step 2: Read project context

Before major changes, read:

- AGENTS.md
- README.md
- docs/architecture.md
- docs/actual-budget-integration.md
- docs/extraction-schema.md
- docs/notion-output.md

If these files do not exist yet, create or update them as part of the bootstrap.

### Step 3: Make a small plan

Before implementing, write a short plan in the agent response:

- What files will change
- What behavior will be added
- What tests will be added
- What command will verify it

Do not over-plan. Keep it practical.

### Step 4: Implement in small patches

Prefer small, reviewable changes.

Avoid unrelated rewrites.

Do not reformat the whole repo unless formatting is the requested task.

### Step 5: Add tests

Every core behavior must have tests.

Minimum required tests:

- raw event creation
- extraction from fixture
- validation
- deduplication
- Actual Budget mapping
- Notion summary generation

### Step 6: Run checks

When possible, run:

    pnpm test
    pnpm lint
    pnpm typecheck

If commands do not exist yet, add them to package.json.

### Step 7: Summarize honestly

After changes, summarize:

- what changed
- what files changed
- what tests were run
- what still needs work

Do not claim something is working unless it was actually tested.

## Recommended Tech Stack

Prefer this stack unless the user explicitly changes direction:

- Language: TypeScript / Node.js
- Package manager: pnpm
- Database: SQLite first
- Finance app: Actual Budget
- Actual integration: Node adapter using @actual-app/api
- Notion integration: Notion API
- Email ingestion: Gmail API first, IMAP later if needed
- Android ingestion: Android NotificationListenerService later
- AI extraction: JSON-schema-constrained extractor

Python/FastAPI is allowed only if it is clearly useful, but the first integration layer should prefer Node/TypeScript because Actual Budget integration is easiest from the JS/TS ecosystem.

## Recommended Repository Structure

Use this as the target shape.

Do not create every file immediately unless needed.

    AI-powered-personal-budget/
    ├── AGENTS.md
    ├── README.md
    ├── package.json
    ├── pnpm-workspace.yaml
    ├── tsconfig.base.json
    ├── .env.example
    ├── .gitignore
    ├── apps/
    │   ├── api/
    │   │   ├── package.json
    │   │   └── src/
    │   │       └── index.ts
    │   ├── actual-adapter/
    │   │   ├── package.json
    │   │   └── src/
    │   │       ├── client.ts
    │   │       ├── mapper.ts
    │   │       └── sync.ts
    │   └── android-listener/
    │       └── README.md
    ├── packages/
    │   ├── core/
    │   │   ├── package.json
    │   │   └── src/
    │   │       ├── schemas/
    │   │       │   ├── raw-event.ts
    │   │       │   ├── canonical-transaction.ts
    │   │       │   └── index.ts
    │   │       ├── validation/
    │   │       │   └── validate-transaction.ts
    │   │       ├── dedup/
    │   │       │   └── duplicate-detector.ts
    │   │       └── mapping/
    │   │           └── account-category-mapping.ts
    │   ├── extractor/
    │   │   ├── package.json
    │   │   └── src/
    │   │       ├── rule-extractor.ts
    │   │       ├── ai-extractor.ts
    │   │       └── universal-extractor.ts
    │   ├── collectors/
    │   │   ├── package.json
    │   │   └── src/
    │   │       ├── gmail/
    │   │       ├── imap/
    │   │       └── webhook/
    │   └── notion-writer/
    │       ├── package.json
    │       └── src/
    │           ├── notion-client.ts
    │           ├── hierarchy.ts
    │           └── monthly-summary.ts
    ├── db/
    │   ├── schema.sql
    │   └── migrations/
    ├── fixtures/
    │   ├── paypay-familymart-jpy.json
    │   ├── korean-unknown-krw.json
    │   ├── smbc-starbucks-jpy.json
    │   └── manual-cu-cash-krw.json
    ├── docs/
    │   ├── architecture.md
    │   ├── actual-budget-integration.md
    │   ├── extraction-schema.md
    │   └── notion-output.md
    └── tests/
        ├── extraction/
        ├── validation/
        ├── dedup/
        └── mapping/

## Environment Variables

Create .env.example with this shape:

    # App
    APP_ENV=development
    DATABASE_URL=file:./dev.db
    TIMEZONE=Asia/Tokyo

    # Actual Budget
    ACTUAL_SERVER_URL=http://localhost:5006
    ACTUAL_PASSWORD=
    ACTUAL_BUDGET_ID=
    ACTUAL_DATA_DIR=./actual-data

    # Notion
    NOTION_TOKEN=
    NOTION_ROOT_PAGE_NAME=Fiance note
    NOTION_DATABASE_ID=

    # Email
    GMAIL_CLIENT_ID=
    GMAIL_CLIENT_SECRET=
    GMAIL_REFRESH_TOKEN=
    IMAP_HOST=
    IMAP_USER=
    IMAP_PASSWORD=

    # AI extraction
    OPENAI_API_KEY=
    EXTRACTOR_MODEL=

    # Android notification collector
    ANDROID_WEBHOOK_SECRET=

Never commit .env.

Never commit real tokens, passwords, Gmail credentials, Notion tokens, Actual Budget credentials, or private financial data.

## Data Model Requirements

### Raw Event

A raw event is the original source input.

Required TypeScript shape:

    export type SourceChannel = "email" | "phone_notification" | "manual";

    export type ProcessedStatus = "pending" | "processed" | "failed";

    export interface RawEvent {
      raw_event_id: string;
      source_channel: SourceChannel;
      source_name: string | null;
      sender_or_app: string | null;
      title: string | null;
      body: string | Record<string, unknown>;
      received_at: string;
      external_source_id: string | null;
      processed_status: ProcessedStatus;
      error_message: string | null;
      created_at: string;
    }

Rules:

- raw_event_id must be stable and unique
- external_source_id should use Gmail message ID, Android notification key, or a deterministic hash
- body must preserve the original message
- do not overwrite raw events when extraction changes

### Canonical Transaction

The canonical transaction is independent of Actual Budget and Notion.

Required TypeScript shape:

    export type TransactionType = "expense" | "income" | "transfer";

    export type DuplicateStatus =
      | "unique"
      | "possible_duplicate"
      | "duplicate";

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

Rules:

- amount_value and currency must be separate
- display_amount is only for humans
- actual_transaction_id is null until successful Actual Budget sync
- needs_review=true blocks automatic sync
- possible_duplicate blocks automatic sync

## Universal Extractor Contract

The universal extractor converts raw events into transaction candidates.

Preferred strategy:

1. Rule-based extraction first
2. AI extraction fallback
3. Strict validation after extraction

Extractor must return this shape:

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

AI extractor rules:

- Force JSON output
- Use a schema
- Do not allow free-form financial guesses
- If a field is missing, output null
- Confidence must reflect uncertainty
- The extractor must not directly sync anything

Bad behavior:

    Input says only "12,000원 paid".
    Extractor guesses "CU" as merchant.

Good behavior:

    merchant = null
    category = null
    needs_review = true

## Validation Rules

Validation should run after extraction and before sync.

Minimum validation:

- amount_value exists and is numeric
- currency exists or can be safely inferred
- datetime exists or fallback to received_at
- transaction_type is valid
- source_channel is valid
- merchant can be null
- category can be null
- country can be null if unknown
- Actual Budget account mapping exists before sync
- Actual Budget category mapping exists or category can be Uncategorized

Blocking validation failures:

- Missing amount: do not sync
- Missing currency: do not sync unless safely inferred
- Missing Actual account mapping: do not sync
- possible_duplicate: do not sync
- needs_review: do not sync

Allowed but review-worthy:

- Missing merchant: allowed, needs_review=true
- Missing category: allowed as Uncategorized or needs_review=true
- Missing exact datetime: use received_at with lower confidence

## Deduplication Rules

Deduplication must happen before Actual Budget sync.

Check duplicates using:

- same external_source_id
- same raw_event hash
- same amount
- same currency
- same date or close timestamp
- same or similar merchant
- same payment platform or method
- existing matching transaction in local DB
- existing matching transaction in Actual Budget

Statuses:

- unique
- possible_duplicate
- duplicate

Rules:

- never silently delete uncertain duplicates
- never auto-sync possible duplicates
- mark possible duplicates for review
- store enough metadata to explain why something was flagged

## Actual Budget Adapter Rules

Actual Budget is the main clean finance destination.

The adapter should:

1. Connect to the configured Actual Budget instance/data file
2. Load available accounts/categories/payees
3. Map canonical transactions to Actual Budget transactions
4. Insert only validated transactions
5. Skip needs_review and possible_duplicate transactions
6. Store actual_transaction_id after successful sync
7. Mark sync failures with error messages

Canonical to Actual mapping:

- amount_value + currency -> transaction amount
- datetime/date -> transaction date
- merchant -> payee
- category/subcategory -> category
- payment_method/payment_platform -> account
- memo + raw_event_id -> notes/import metadata
- transaction_id -> internal import ID
- duplicate_status -> pre-sync gate
- needs_review -> pre-sync gate

Account mapping examples:

- PayPay notification -> Actual account: PayPay
- SMBC email -> Actual account: SMBC Card
- Cash manual input, JPY -> Actual account: Cash JPY
- Cash manual input, KRW -> Actual account: Cash KRW
- Unknown payment app -> needs_review before sync

Category mapping examples:

- FamilyMart / CU -> Convenience Store
- Starbucks -> Cafe
- Train / Suica / subway -> Transport
- Mercari -> Shopping
- Unknown merchant -> Uncategorized or needs_review

## Notion Writer Rules

Notion is the monthly note and summary layer, not the primary ledger.

The Notion writer should:

- find or create the year page under "Fiance note"
- find or create the month page under the year page
- update monthly summaries
- update needs-review sections
- update sync-failure sections
- never create daily child pages

Required hierarchy:

    Fiance note
    └── 2026
        └── May

Month page should contain:

- Monthly Summary
- Daily Summary View
- Category Summary
- Payment Method Summary
- Needs Review Transactions
- Possible Duplicates
- Recent Synced Transactions
- Sync Failures

Summary should group by currency first:

    JPY:
    - Total
    - Category totals
    - Account/payment method totals

    KRW:
    - Total
    - Category totals
    - Account/payment method totals

## Input Source Requirements

### Email Collector

Target examples:

- SMBC
- Mercari / Merpay
- Other card/payment emails

Capture:

- sender
- subject
- body
- received_at
- attachments metadata if needed
- message_id
- thread_id

Do not parse and discard the original email.

Always create a raw event first.

### Android Notification Collector

Target examples:

- PayPay
- Korean payment apps
- Mobile banking/payment apps

Capture:

- app package name
- notification title
- notification body
- posted time
- notification key/hash

Always create a raw event first.

### Manual Input

MVP can be:

- CLI
- local web form

Manual input fields:

- Amount
- Currency
- Merchant / Memo
- Payment Method
- Category
- Date
- Country
- Actual Budget account
- Actual Budget category

Manual input must still follow:

    manual input
    -> raw event
    -> canonical transaction
    -> validation
    -> dedup
    -> Actual Budget sync
    -> Notion summary update

## Required Fixtures

Create fixtures for these examples.

### PayPay FamilyMart JPY

Fixture:

    {
      "source_channel": "phone_notification",
      "source_name": "paypay",
      "sender_or_app": "jp.ne.paypay.android.app",
      "title": "PayPay",
      "body": "ファミリーマートで680円を支払いました",
      "received_at": "2026-05-24T20:15:00+09:00"
    }

Expected:

- amount_value = 680
- currency = JPY
- merchant = FamilyMart or ファミリーマート
- payment_platform = PayPay
- payment_method = PayPay
- country = JP
- needs_review = false if account mapping exists

### Korean Unknown KRW

Fixture:

    {
      "source_channel": "phone_notification",
      "source_name": "unknown_korean_payment_app",
      "sender_or_app": "unknown",
      "title": "결제 알림",
      "body": "결제가 완료되었습니다. 12,000원",
      "received_at": "2026-05-25T20:15:00+09:00"
    }

Expected:

- amount_value = 12000
- currency = KRW
- merchant = null
- category = null
- needs_review = true
- sync_to_actual = false

### SMBC Starbucks JPY

Fixture:

    {
      "source_channel": "email",
      "source_name": "smbc",
      "sender_or_app": "example@smbc-card.com",
      "title": "ご利用通知",
      "body": "カードをご利用いただきました。金額: 520円 店舗: Starbucks",
      "received_at": "2026-05-24T20:10:00+09:00"
    }

Expected:

- amount_value = 520
- currency = JPY
- merchant = Starbucks
- payment_method = SMBC Card
- category = Cafe if mapping exists

### Manual CU Cash KRW

Fixture:

    {
      "source_channel": "manual",
      "source_name": "manual_cash_input",
      "body": {
        "amount": 7000,
        "currency": "KRW",
        "merchant": "CU",
        "payment_method": "Cash",
        "category": "Convenience store",
        "country": "KR",
        "actual_account_name": "Cash KRW"
      },
      "received_at": "2026-05-25T21:00:00+09:00"
    }

Expected:

- amount_value = 7000
- currency = KRW
- merchant = CU
- actual_account_name = Cash KRW
- needs_review = false if required fields exist

## Testing Requirements

Use unit tests for core packages.

Minimum test groups:

- tests/extraction/
- tests/validation/
- tests/dedup/
- tests/mapping/
- tests/notion/
- tests/actual-adapter/

Required test cases:

- PayPay Japanese notification extraction
- Korean unknown notification extraction
- SMBC email extraction
- Manual KRW cash transaction
- Missing amount blocks sync
- Missing account mapping blocks sync
- Missing merchant marks needs_review
- Possible duplicate blocks sync
- Notion writer does not create daily pages
- Actual adapter stores actual_transaction_id after successful mock sync

Testing principles:

- do not hit real Actual Budget in unit tests
- do not hit real Notion in unit tests
- mock external APIs
- keep realistic fixtures
- include Japanese and Korean text fixtures

## Security and Privacy Rules

This project handles personal finance data.

Never commit:

- .env
- tokens
- passwords
- real Gmail content
- real notification dumps
- real Actual Budget files
- real Notion tokens
- private financial exports

Use sanitized fixtures only.

If adding logs:

- avoid logging full email bodies by default
- avoid logging credentials
- avoid logging access tokens
- allow debug logging only behind explicit config

Safe logging example:

    Processed raw_event_id=evt_123 source=paypay status=needs_review

Unsafe logging example:

    Full Gmail body with card details and user information

## Database Rules

Use SQLite first.

Recommended tables:

- raw_events
- canonical_transactions
- actual_sync_log
- account_mappings
- category_mappings
- dedup_candidates
- review_queue

Rules:

- use migrations
- do not manually mutate schema without migration
- store timestamps in ISO 8601
- use Asia/Tokyo as default timezone unless source provides timezone
- store original received_at from the source

## Review Queue Rules

Transactions should enter review when:

- amount missing
- currency uncertain
- merchant missing
- category uncertain
- account mapping missing
- possible duplicate
- AI confidence too low
- extractor output fails schema validation

Review queue should show:

- raw_event_id
- transaction_id
- source_channel
- source_name
- raw_text/body summary
- extracted amount/currency
- missing fields
- reason for review
- suggested fix if safe

Do not auto-fix review items using guesses.

## CLI Behavior Guidelines

If implementing a CLI, prefer commands like:

    pnpm dev
    pnpm test
    pnpm lint
    pnpm typecheck

    pnpm finance ingest:fixture fixtures/paypay-familymart-jpy.json
    pnpm finance manual:add
    pnpm finance extract:pending
    pnpm finance sync:actual
    pnpm finance sync:notion
    pnpm finance review:list
    pnpm finance review:approve <transaction_id>

CLI commands should be idempotent where possible.

Running the same ingestion twice should not create duplicate synced transactions.

## Documentation Requirements

Keep docs updated.

Required docs:

- docs/architecture.md
- docs/actual-budget-integration.md
- docs/extraction-schema.md
- docs/notion-output.md

README should include:

- project purpose
- architecture summary
- setup
- env vars
- local commands
- MVP flow
- testing

Do not let docs drift from implemented behavior.

If behavior changes, update docs in the same patch.

## Build Order

Follow this order unless the user says otherwise.

### Phase 1: Bootstrap

- Initialize pnpm TypeScript monorepo
- Add .env.example
- Add SQLite schema
- Add core types
- Add fixtures
- Add unit test setup

### Phase 2: Manual input MVP

- Add CLI or local form
- Save manual input as raw event
- Convert to canonical transaction
- Validate
- Mock Actual Budget sync

### Phase 3: Actual Budget adapter

- Add Actual Budget connection config
- Load accounts/categories
- Map canonical transactions
- Sync validated transactions
- Store actual_transaction_id

### Phase 4: Notion summary writer

- Find/create Fiance note -> year -> month
- Update monthly summary
- Add needs-review section
- Add sync-failure section
- Ensure no daily pages

### Phase 5: Email ingestion

- Add Gmail or IMAP collector
- Store raw emails
- Extract payment data
- Validate and sync

### Phase 6: Android notification ingestion

- Add Android NotificationListenerService plan or app skeleton
- Add webhook receiver
- Store raw notifications
- Extract PayPay/Korean app payments

### Phase 7: AI extractor and review loop

- Add schema-constrained AI extraction
- Add confidence scoring
- Add review queue
- Add approval flow

### Phase 8: Dedup and reconciliation

- Dedup local raw events
- Dedup canonical transactions
- Compare against existing Actual Budget transactions
- Block possible duplicates from sync

## Coding Style

Use:

- TypeScript strict mode
- explicit types for financial data
- small pure functions for extraction/validation/dedup
- dependency injection for external clients
- mocks for external APIs

Avoid:

- any unless unavoidable
- hidden global state
- direct API calls inside pure logic
- mixing extraction with syncing
- mixing Notion formatting with transaction validation

Preferred module boundaries:

- collectors: source input only
- extractor: raw event -> extraction result
- core validation: extraction result -> valid/invalid canonical transaction
- dedup: canonical transaction -> duplicate status
- actual-adapter: canonical transaction -> Actual Budget transaction
- notion-writer: summaries/review sections only

## Financial Data Invariants

Always preserve these invariants:

- amount_value is numeric or null
- currency is ISO code or null
- display_amount is derived, not authoritative
- raw_event_id links every transaction to source data
- actual_transaction_id is null until synced
- needs_review blocks automatic sync
- possible_duplicate blocks automatic sync
- missing account mapping blocks automatic sync

Do not break these invariants for convenience.

## Agent-Specific Instructions

When asked to implement something:

1. Inspect current files
2. Respect this AGENTS.md
3. Make the smallest working change
4. Add or update tests
5. Run available checks
6. Report exactly what changed

When the repo is empty:

- create only the minimal bootstrap required
- do not create a giant fake-complete app
- prefer real working skeletons over placeholder complexity

When uncertain:

- prefer needs_review over guessing
- prefer not_synced over unsafe sync
- prefer null over hallucinated financial data
- prefer small patch over broad rewrite

## Definition of Done

A task is done only when:

- implementation matches this AGENTS.md
- tests are added or updated
- typecheck passes if available
- lint passes if available
- no secrets are committed
- no real private financial data is committed
- docs are updated if behavior changed
- uncertain transactions are not auto-synced
- Notion daily pages are not created

Final response from an agent should include:

    Summary:
    - ...

    Changed files:
    - ...

    Tests/checks:
    - ...

    Notes / limitations:
    - ...

## One-Sentence Product Description

An AI spending ingestion layer for Actual Budget that captures Japanese/Korean payment emails, phone notifications, and manual cash entries, normalizes them into validated multi-currency transactions, syncs them into Actual Budget, and updates monthly Notion summaries.

## Core Value

    Messy payment messages in.
    Clean Actual Budget transactions out.
    Readable Notion monthly summaries updated.
