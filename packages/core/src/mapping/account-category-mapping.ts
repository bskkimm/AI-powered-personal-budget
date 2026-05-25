export interface AccountMapping {
  sourceName: string;
  platform: string | null;
  actualAccountId: string;
  actualAccountName: string;
}

export interface CategoryMapping {
  merchant: string | null;
  category: string;
  subcategory: string | null;
}

const DEFAULT_ACCOUNT_MAPPINGS: AccountMapping[] = [
  { sourceName: "paypay", platform: "PayPay", actualAccountId: "acc_paypay", actualAccountName: "PayPay" },
  { sourceName: "smbc", platform: "SMBC Card", actualAccountId: "acc_smbc", actualAccountName: "SMBC Card" },
  { sourceName: "manual_cash_input", platform: null, actualAccountId: "", actualAccountName: "" },
];

const DEFAULT_CATEGORY_MAPPINGS: CategoryMapping[] = [
  { merchant: "FamilyMart", category: "Convenience Store", subcategory: null },
  { merchant: "ファミリーマート", category: "Convenience Store", subcategory: null },
  { merchant: "CU", category: "Convenience Store", subcategory: null },
  { merchant: "Starbucks", category: "Cafe", subcategory: null },
  { merchant: "Mercari", category: "Shopping", subcategory: null },
];

export function resolveAccountMapping(
  sourceName: string | null,
  platform: string | null,
  mappings?: AccountMapping[],
): { actualAccountId: string; actualAccountName: string } | null {
  const map = mappings ?? DEFAULT_ACCOUNT_MAPPINGS;
  for (const m of map) {
    if (sourceName && m.sourceName === sourceName) {
      if (!m.actualAccountId && !m.actualAccountName) return null;
      return { actualAccountId: m.actualAccountId, actualAccountName: m.actualAccountName };
    }
    if (platform && m.platform === platform) {
      if (!m.actualAccountId && !m.actualAccountName) return null;
      return { actualAccountId: m.actualAccountId, actualAccountName: m.actualAccountName };
    }
  }
  return null;
}

export function resolveCategoryMapping(
  merchant: string | null,
  mappings?: CategoryMapping[],
): { category: string; subcategory: string | null } | null {
  if (!merchant) return null;
  const map = mappings ?? DEFAULT_CATEGORY_MAPPINGS;
  for (const m of map) {
    if (m.merchant && m.merchant.toLowerCase() === merchant.toLowerCase()) {
      return { category: m.category, subcategory: m.subcategory };
    }
  }
  return null;
}

export function getDefaultAccountMappings(): AccountMapping[] {
  return [...DEFAULT_ACCOUNT_MAPPINGS];
}

export function getDefaultCategoryMappings(): CategoryMapping[] {
  return [...DEFAULT_CATEGORY_MAPPINGS];
}
