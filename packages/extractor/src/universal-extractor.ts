import type { RawEvent, ExtractionResult } from "@ai-budget/core";
import { extractFromRawEvent } from "./rule-extractor.js";
import type { AiExtractor } from "./ai-extractor.js";

export interface UniversalExtractorOptions {
  aiExtractor?: AiExtractor;
  maxConfidenceForAi?: number;
}

export async function universalExtract(
  event: RawEvent,
  options: UniversalExtractorOptions = {},
): Promise<ExtractionResult> {
  const ruleResult = extractFromRawEvent(event);

  if (!ruleResult.needs_review) {
    return ruleResult;
  }

  if (
    ruleResult.amount_value !== null &&
    ruleResult.currency !== null
  ) {
    return ruleResult;
  }

  if (options.aiExtractor) {
    const aiResult = await options.aiExtractor.extract(event);

    return {
      ...ruleResult,
      ...aiResult,
      confidence: {
        datetime: Math.max(ruleResult.confidence.datetime, aiResult.confidence.datetime),
        amount: Math.max(ruleResult.confidence.amount, aiResult.confidence.amount),
        currency: Math.max(ruleResult.confidence.currency, aiResult.confidence.currency),
        merchant: Math.max(ruleResult.confidence.merchant, aiResult.confidence.merchant),
        category: Math.max(ruleResult.confidence.category, aiResult.confidence.category),
        account_mapping: Math.max(
          ruleResult.confidence.account_mapping,
          aiResult.confidence.account_mapping,
        ),
      },
      needs_review: aiResult.needs_review && ruleResult.needs_review,
    };
  }

  return ruleResult;
}
