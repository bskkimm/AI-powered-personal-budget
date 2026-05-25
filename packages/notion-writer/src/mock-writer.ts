import type { CanonicalTransaction } from "@ai-budget/core";
import type {
  PageRef,
  CurrencySummary,
  MonthlySummary,
  NotionSummaryWriter,
} from "./types.js";

interface StoredPage {
  id: string;
  title: string;
  parentId: string | null;
}

export class MockNotionWriter implements NotionSummaryWriter {
  private pages: Map<string, StoredPage> = new Map();
  private nextId = 0;
  private monthlyContents: Map<string, CanonicalTransaction[]> = new Map();
  private reviewContents: Map<string, CanonicalTransaction[]> = new Map();
  private failureContents: Map<string, CanonicalTransaction[]> = new Map();
  public createdDailyPages: string[] = [];

  private genId(prefix: string): string {
    return `${prefix}_${String(++this.nextId).padStart(3, "0")}`;
  }

  private storePage(title: string, parentId: string | null): PageRef {
    if (this.isDailyPage(title, parentId)) {
      this.createdDailyPages.push(title);
      throw new Error(
        `Cannot create daily child page: "${title}". Daily pages are not allowed.`,
      );
    }
    const id = this.genId("page");
    this.pages.set(id, { id, title, parentId });
    return { id, title };
  }

  private isDailyPage(title: string, parentId: string | null): boolean {
    if (!parentId) return false;
    const parent = this.pages.get(parentId);
    if (!parent) return false;
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];
    const isMonthPage = monthNames.some((m) => parent.title.startsWith(m));
    if (!isMonthPage) return false;
    return /\d{1,2}/.test(title);
  }

  private getYearPageId(rootName: string, year: number): string | null {
    for (const [, page] of this.pages) {
      const rootPage = this.pages.get(page.parentId ?? "");
      if (
        page.title === String(year) &&
        rootPage?.title === rootName
      ) {
        return page.id;
      }
    }
    return null;
  }

  async findOrCreateYearPage(
    rootPageName: string,
    year: number,
  ): Promise<PageRef> {
    const existing = this.getYearPageId(rootPageName, year);
    if (existing) {
      const page = this.pages.get(existing)!;
      return { id: page.id, title: page.title };
    }
    const root = this.storePage(rootPageName, null);
    return this.storePage(String(year), root.id);
  }

  async findOrCreateMonthPage(
    yearPageId: string,
    year: number,
    month: number,
  ): Promise<PageRef> {
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];
    const monthName = monthNames[month - 1];
    for (const [, page] of this.pages) {
      if (
        page.parentId === yearPageId &&
        page.title.startsWith(String(year)) &&
        page.title.includes(monthName)
      ) {
        return { id: page.id, title: page.title };
      }
    }
    return this.storePage(`${year} ${monthName}`, yearPageId);
  }

  async updateMonthlySummary(
    monthPageId: string,
    transactions: CanonicalTransaction[],
  ): Promise<MonthlySummary> {
    this.monthlyContents.set(monthPageId, transactions);
    return this.computeSummary(transactions);
  }

  async updateNeedsReviewSection(
    monthPageId: string,
    transactions: CanonicalTransaction[],
  ): Promise<void> {
    this.reviewContents.set(monthPageId, transactions);
  }

  async updateSyncFailureSection(
    monthPageId: string,
    transactions: CanonicalTransaction[],
  ): Promise<void> {
    this.failureContents.set(monthPageId, transactions);
  }

  getReviewTransactions(monthPageId: string): CanonicalTransaction[] {
    return this.reviewContents.get(monthPageId) ?? [];
  }

  getFailureTransactions(monthPageId: string): CanonicalTransaction[] {
    return this.failureContents.get(monthPageId) ?? [];
  }

  getMonthlyTransactions(monthPageId: string): CanonicalTransaction[] {
    return this.monthlyContents.get(monthPageId) ?? [];
  }

  private computeSummary(
    transactions: CanonicalTransaction[],
  ): MonthlySummary {
    const byCurrency = new Map<string, CanonicalTransaction[]>();

    for (const tx of transactions) {
      const ccy = tx.currency ?? "Unknown";
      if (!byCurrency.has(ccy)) byCurrency.set(ccy, []);
      byCurrency.get(ccy)!.push(tx);
    }

    const currencies: CurrencySummary[] = [];

    for (const [currency, txs] of byCurrency) {
      const total = txs.reduce(
        (sum, tx) => sum + (tx.amount_value ?? 0),
        0,
      );

      const categoryMap = new Map<string, { total: number; count: number }>();
      const methodMap = new Map<string, { total: number; count: number }>();
      const dailyMap = new Map<string, { total: number; count: number }>();

      for (const tx of txs) {
        const cat = tx.category ?? "Uncategorized";
        const method = tx.payment_method ?? tx.payment_platform ?? "Unknown";
        const date = tx.date ?? tx.datetime?.slice(0, 10) ?? "unknown";

        if (!categoryMap.has(cat)) categoryMap.set(cat, { total: 0, count: 0 });
        categoryMap.get(cat)!.total += tx.amount_value ?? 0;
        categoryMap.get(cat)!.count++;

        if (!methodMap.has(method)) methodMap.set(method, { total: 0, count: 0 });
        methodMap.get(method)!.total += tx.amount_value ?? 0;
        methodMap.get(method)!.count++;

        if (!dailyMap.has(date)) dailyMap.set(date, { total: 0, count: 0 });
        dailyMap.get(date)!.total += tx.amount_value ?? 0;
        dailyMap.get(date)!.count++;
      }

      currencies.push({
        currency,
        total,
        transaction_count: txs.length,
        categories: Array.from(categoryMap.entries()).map(
          ([name, v]) => ({ name, total: v.total, count: v.count }),
        ),
        payment_methods: Array.from(methodMap.entries()).map(
          ([name, v]) => ({ name, total: v.total, count: v.count }),
        ),
        daily: Array.from(dailyMap.entries()).map(
          ([date, v]) => ({ date, total: v.total, count: v.count }),
        ),
      });
    }

    const month =
      transactions[0]?.month ?? "unknown";

    return { month, currencies };
  }
}
