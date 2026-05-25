export interface PageRef {
  id: string;
  title: string;
}

export interface CurrencySummary {
  currency: string;
  total: number;
  transaction_count: number;
  categories: { name: string; total: number; count: number }[];
  payment_methods: { name: string; total: number; count: number }[];
  daily: { date: string; total: number; count: number }[];
}

export interface MonthlySummary {
  month: string;
  currencies: CurrencySummary[];
}

export interface NotionSummaryWriter {
  findOrCreateYearPage(
    rootPageName: string,
    year: number,
  ): Promise<PageRef>;

  findOrCreateMonthPage(
    yearPageId: string,
    year: number,
    month: number,
  ): Promise<PageRef>;

  updateMonthlySummary(
    monthPageId: string,
    transactions: import("@ai-budget/core").CanonicalTransaction[],
  ): Promise<MonthlySummary>;

  updateNeedsReviewSection(
    monthPageId: string,
    transactions: import("@ai-budget/core").CanonicalTransaction[],
  ): Promise<void>;

  updateSyncFailureSection(
    monthPageId: string,
    transactions: import("@ai-budget/core").CanonicalTransaction[],
  ): Promise<void>;
}
