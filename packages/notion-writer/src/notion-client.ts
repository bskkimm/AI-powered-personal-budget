import { Client } from "@notionhq/client";
import type { NotionSummaryWriter, PageRef, MonthlySummary } from "./types.js";
import type { CanonicalTransaction } from "@ai-budget/core";

/* eslint-disable @typescript-eslint/no-explicit-any */

export class NotionApiWriter implements NotionSummaryWriter {
  private notion: Client;

  constructor(token: string) {
    this.notion = new Client({ auth: token });
  }

  async findOrCreateYearPage(
    rootPageName: string,
    year: number,
  ): Promise<PageRef> {
    const rootPage = await this.findOrCreateRootPage(rootPageName);
    const yearTitle = String(year);

    const existing = await this.findChildPage(rootPage.id, yearTitle);
    if (existing) return existing;

    const newPage = await this.notion.pages.create({
      parent: { page_id: rootPage.id },
      properties: {
        title: {
          title: [{ text: { content: yearTitle } }],
        },
      },
    } as any);

    return { id: newPage.id, title: yearTitle };
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
    const title = `${year} ${monthName}`;

    const existing = await this.findChildPage(yearPageId, title);
    if (existing) return existing;

    const newPage = await this.notion.pages.create({
      parent: { page_id: yearPageId },
      properties: {
        title: {
          title: [{ text: { content: title } }],
        },
      },
    } as any);

    return { id: newPage.id, title };
  }

  async updateMonthlySummary(
    monthPageId: string,
    transactions: CanonicalTransaction[],
  ): Promise<MonthlySummary> {
    const summary = this.computeSummary(transactions);
    const blocks = this.buildSummaryBlocks(summary);
    await this.notion.blocks.children.append({
      block_id: monthPageId,
      children: blocks as any,
    });
    return summary;
  }

  async updateNeedsReviewSection(
    monthPageId: string,
    transactions: CanonicalTransaction[],
  ): Promise<void> {
    const blocks = this.buildTransactionBlocks(
      "Needs Review Transactions",
      transactions,
    );
    await this.notion.blocks.children.append({
      block_id: monthPageId,
      children: blocks as any,
    });
  }

  async updateSyncFailureSection(
    monthPageId: string,
    transactions: CanonicalTransaction[],
  ): Promise<void> {
    const blocks = this.buildTransactionBlocks(
      "Sync Failures",
      transactions,
    );
    await this.notion.blocks.children.append({
      block_id: monthPageId,
      children: blocks as any,
    });
  }

  private async findOrCreateRootPage(rootName: string): Promise<PageRef> {
    const response = await this.notion.search({
      query: rootName,
      filter: { property: "object", value: "page" },
    });

    for (const result of response.results) {
      if (
        "properties" in result &&
        "title" in (result as any).properties
      ) {
        const titleText = (result as any).properties.title?.title?.[0]?.plain_text;
        if (titleText === rootName) {
          return { id: result.id, title: rootName };
        }
      }
    }

    throw new Error(
      `Root page "${rootName}" not found. ` +
      `Create it manually in Notion, then add the integration in the page's Connections menu.`,
    );
  }

  private async findChildPage(
    parentId: string,
    title: string,
  ): Promise<PageRef | null> {
    const response = await this.notion.blocks.children.list({
      block_id: parentId,
    });

    for (const block of response.results) {
      if (
        "type" in block &&
        block.type === "child_page" &&
        "child_page" in block &&
        block.child_page?.title === title
      ) {
        return { id: block.id, title };
      }
    }

    return null;
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

    return {
      month: transactions[0]?.month ?? "unknown",
      currencies: Array.from(byCurrency.entries()).map(
        ([currency, txs]) => {
          const total = txs.reduce((s, t) => s + (t.amount_value ?? 0), 0);
          return {
            currency,
            total,
            transaction_count: txs.length,
            categories: [],
            payment_methods: [],
            daily: [],
          };
        },
      ),
    };
  }

  private buildSummaryBlocks(
    summary: MonthlySummary,
  ): Record<string, unknown>[] {
    const blocks: Record<string, unknown>[] = [
      {
        object: "block",
        type: "heading_2",
        heading_2: {
          rich_text: [{ type: "text", text: { content: "Monthly Summary" } }],
        },
      },
    ];

    for (const ccy of summary.currencies) {
      blocks.push({
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [
            {
              type: "text",
              text: {
                content: `${ccy.currency}: ${ccy.total} (${ccy.transaction_count} transactions)`,
              },
            },
          ],
        },
      });
    }

    return blocks;
  }

  private buildTransactionBlocks(
    heading: string,
    transactions: CanonicalTransaction[],
  ): Record<string, unknown>[] {
    const blocks: Record<string, unknown>[] = [
      {
        object: "block",
        type: "heading_2",
        heading_2: {
          rich_text: [{ type: "text", text: { content: heading } }],
        },
      },
    ];

    for (const tx of transactions) {
      blocks.push({
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [
            {
              type: "text",
              text: {
                content: `${tx.date ?? "unknown"} | ${tx.merchant ?? "unknown"} | ${tx.display_amount ?? tx.amount_value ?? "?"}`,
              },
            },
          ],
        },
      });
    }

    if (transactions.length === 0) {
      blocks.push({
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [{ type: "text", text: { content: "None" } }],
        },
      });
    }

    return blocks;
  }
}
