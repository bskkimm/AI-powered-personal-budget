import type { PageRef, NotionSummaryWriter } from "./types.js";

export interface HierarchyResult {
  rootPage: PageRef;
  yearPage: PageRef;
  monthPage: PageRef;
}

export async function ensureMonthlyHierarchy(
  writer: NotionSummaryWriter,
  rootPageName: string,
  year: number,
  month: number,
): Promise<HierarchyResult> {
  const yearPage = await writer.findOrCreateYearPage(rootPageName, year);
  const monthPage = await writer.findOrCreateMonthPage(yearPage.id, year, month);

  return {
    rootPage: { id: yearPage.id, title: rootPageName },
    yearPage,
    monthPage,
  };
}
