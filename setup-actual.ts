#!/usr/bin/env node
// Setup: Create a local Actual Budget file and configure accounts/categories.
// Run once:
//   npx tsx setup-actual.ts
//
// This creates a local budget at ./actual-data/ (no server required).
// The budget file is a plain SQLite database managed by @actual-app/api.

import api from "@actual-app/api";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const DATA_DIR = join(process.cwd(), "actual-data");
const ENV_FILE = join(process.cwd(), ".env");

async function main() {
  console.log("Setting up local Actual Budget...\n");

  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

  // 1. Initialize API in local-only mode (no server = no network)
  await api.init({
    dataDir: DATA_DIR,
  });
  console.log("Initialized local API.");

  // 2. Create a new budget file using runImport
  const budgetName = "Personal Budget";
  const syncId = "local-" + Date.now().toString(36);

  console.log(`Creating budget "${budgetName}"...`);
  await api.runImport(budgetName, async () => {
    // Create accounts
    const accounts = [
      { name: "PayPay", type: "checking" },
      { name: "SMBC Card", type: "credit" },
      { name: "Cash JPY", type: "checking" },
      { name: "Cash KRW", type: "checking" },
    ];

    for (const acct of accounts) {
      const id = await api.createAccount(acct);
      console.log(`  Account: ${acct.name} (${id})`);
    }

    // Create category groups
    const expenseGroupId = await api.createCategoryGroup({ name: "Expenses" });

    // Create categories
    const categories = [
      { name: "Convenience Store", group_id: expenseGroupId },
      { name: "Cafe", group_id: expenseGroupId },
      { name: "Transport", group_id: expenseGroupId },
      { name: "Shopping", group_id: expenseGroupId },
      { name: "Groceries", group_id: expenseGroupId },
      { name: "Uncategorized", group_id: expenseGroupId },
    ];

    for (const cat of categories) {
      const id = await api.createCategory(cat);
      console.log(`  Category: ${cat.name} (${id})`);
    }
  });

  console.log(`\nBudget created. Sync ID: ${syncId}\n`);

  // 3. Store budget info in .env
  updateEnv("ACTUAL_SERVER_URL", "");
  updateEnv("ACTUAL_PASSWORD", "");
  updateEnv("ACTUAL_BUDGET_ID", syncId);
  updateEnv("ACTUAL_DATA_DIR", DATA_DIR);
  updateEnv("ACTUAL_FILE_PASSWORD", "");

  console.log("Updated .env with ACTUAL_BUDGET_ID and ACTUAL_DATA_DIR.");
  console.log("\nSetup complete! Try:");
  console.log("  pnpm test                        # all tests still pass");
  console.log("  pnpm finance ingest:fixture fixtures/manual-cu-cash-krw.json");
  console.log("  pnpm finance sync:actual          # sync to local Actual Budget\n");

  await api.shutdown();
}

function updateEnv(key: string, value: string) {
  let content = "";
  if (existsSync(ENV_FILE)) {
    content = readFileSync(ENV_FILE, "utf-8");
  }

  const lines = content.split("\n");
  const found = lines.findIndex((l) => l.startsWith(key + "="));

  if (found >= 0) {
    lines[found] = `${key}=${value}`;
  } else {
    lines.push(`${key}=${value}`);
  }

  writeFileSync(ENV_FILE, lines.filter(Boolean).join("\n") + "\n");
}

main().catch((err) => {
  console.error("Setup failed:", err);
  process.exit(1);
});
