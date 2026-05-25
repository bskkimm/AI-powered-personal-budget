import { describe, it, expect } from "vitest";
import { universalExtract, AiExtractorPlaceholder } from "@ai-budget/extractor";
import type { RawEvent } from "@ai-budget/core";

function makeEvent(overrides: Partial<RawEvent> = {}): RawEvent {
  return {
    raw_event_id: "evt_001",
    source_channel: "phone_notification",
    source_name: "paypay",
    sender_or_app: null,
    title: null,
    body: "ファミリーマートで680円を支払いました",
    received_at: "2026-05-24T20:15:00+09:00",
    external_source_id: null,
    processed_status: "pending",
    error_message: null,
    created_at: "2026-05-24T20:15:00+09:00",
    ...overrides,
  };
}

describe("universalExtract", () => {
  it("should return rule-based result when rules match", async () => {
    const event = makeEvent();
    const result = await universalExtract(event);
    expect(result.amount_value).toBe(680);
    expect(result.currency).toBe("JPY");
    expect(result.merchant).toBe("ファミリーマート");
    expect(result.needs_review).toBe(false);
  });

  it("should not call AI when rule result is complete", async () => {
    const event = makeEvent();
    const aiExtractor = new AiExtractorPlaceholder();
    const result = await universalExtract(event, { aiExtractor });
    expect(result.amount_value).toBe(680);
    expect(result.needs_review).toBe(false);
  });

  it("should use AI fallback for unrecognized events", async () => {
    const event = makeEvent({
      source_name: "unknown",
      body: "Some unknown payment message",
    });
    const aiExtractor = new AiExtractorPlaceholder();
    const result = await universalExtract(event, { aiExtractor });
    expect(result.needs_review).toBe(true);
  });

  it("should return needs_review for unknown without AI", async () => {
    const event = makeEvent({
      source_name: "unknown",
      body: "Some unknown payment message",
    });
    const result = await universalExtract(event);
    expect(result.needs_review).toBe(true);
    expect(result.amount_value).toBeNull();
  });
});
