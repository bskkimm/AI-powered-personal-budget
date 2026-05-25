# Setup Guide (Office PC)

## One-time setup

```bash
# 1. Clone the project
git clone <your-repo-url>
cd AI-powered-personal-budget

# 2. Copy your .env file into this folder
#    (contains Gmail keys, Notion token — never commit this)

# 3. Install dependencies
pnpm install

# 4. Create local Actual Budget file (accounts + categories)
npx tsx setup-actual.ts

# 5. Verify
pnpm finance status
```

## Commands

```bash
pnpm finance auto                    # Gmail → extract → sync → Notion (single command)
pnpm finance ingest:fixture <path>   # Import a fixture file
pnpm finance fetch:gmail             # Fetch unread Gmail messages
pnpm finance sync                    # Sync to Actual Budget
pnpm finance sync:notion             # Update Notion monthly summary
pnpm finance status                  # View transaction status
```

## Auto-run every 30 minutes

```bash
echo "*/30 * * * * cd ~/workspace/AI-powered-personal-budget && DATABASE_URL=\"file:./dev.db\" pnpm finance auto >> ~/budget.log 2>&1" | crontab -
```

View logs: `cat ~/budget.log`

Stop auto-run: `crontab -r`

## What happens each run

```
Unread Gmail → extract amount/merchant/currency
  → validate (skip uncertain)
  → sync to Actual Budget
  → update Notion "Finance note > 2026 > May"
```
