// Spike: Real Actual Budget API integration exploration.
// NOT part of production flow. Run manually to test connection.
//
// Usage (with a local Actual server running):
//   npx tsx apps/actual-adapter/src/spike.ts
//
// Requires .env with:
//   ACTUAL_SERVER_URL=http://localhost:5006
//   ACTUAL_PASSWORD=<your-server-password>
//   ACTUAL_BUDGET_ID=<sync-id-from-settings>
//   ACTUAL_DATA_DIR=./actual-data

import api from "@actual-app/api";

async function main() {
  const serverURL = process.env.ACTUAL_SERVER_URL;
  const password = process.env.ACTUAL_PASSWORD;
  const budgetId = process.env.ACTUAL_BUDGET_ID;

  if (!serverURL || !password || !budgetId) {
    console.error(
      "Missing ACTUAL_SERVER_URL, ACTUAL_PASSWORD, or ACTUAL_BUDGET_ID",
    );
    process.exit(1);
  }

  // 1. Connect
  await api.init({
    dataDir: process.env.ACTUAL_DATA_DIR ?? "./actual-data",
    serverURL,
    password,
  });
  console.log("Connected to server at", serverURL);

  // 2. Download/open budget
  await api.downloadBudget(budgetId);
  console.log("Opened budget", budgetId);

  // 3. Load accounts
  const accounts = await api.getAccounts();
  console.log("Accounts:");
  for (const a of accounts) {
    console.log(`  ${a.id} — ${a.name}${a.closed ? " (closed)" : ""}`);
  }

  // 4. Load categories
  const categories = await api.getCategories();
  console.log("Categories:");
  for (const c of categories.slice(0, 10)) {
    console.log(`  ${c.id} — ${c.name} (group: ${c.group_id})`);
  }

  // 5. Load payees
  const payees = await api.getPayees();
  const transferPayees = payees.filter((p) => p.transfer_acct);
  console.log(`Payees: ${payees.length} total, ${transferPayees.length} transfer payees`);

  // 6. Try a dry-run import (does not commit)
  if (accounts.length > 0) {
    const accountId = accounts[0].id;
    const testTx = {
      date: "2026-05-24",
      amount: 680, // 680 JPY
      payee_name: "FamilyMart",
      notes: "Spike test — safe to delete | transaction_id=spike_001",
      imported_id: "spike_001",
      cleared: false,
    };

    const result = await api.importTransactions(accountId, [testTx], {
      dryRun: true,
      defaultCleared: false,
    });
    console.log("Dry-run import result:", JSON.stringify(result, null, 2));

    // 7. Lookup by name
    const accountIdByName = await api.getIDByName("accounts", accounts[0].name);
    console.log(`getIDByName("accounts", "${accounts[0].name}") = ${accountIdByName}`);
  }

  // 8. Cleanup
  await api.shutdown();
  console.log("Disconnected.");
}

main().catch((err) => {
  console.error("Spike failed:", err);
  process.exit(1);
});
