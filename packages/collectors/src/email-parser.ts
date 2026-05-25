import type { RawEvent } from "@ai-budget/core";
import type { ParsedEmail } from "./email-types.js";
import { createHash } from "node:crypto";

export function emailToRawEvent(
  email: ParsedEmail,
  sourceName: string,
): RawEvent {
  const now = new Date().toISOString();

  const rawEventId = `evt_${createHash("sha256")
    .update(email.message_id)
    .digest("hex")
    .slice(0, 12)}`;

  return {
    raw_event_id: rawEventId,
    source_channel: "email",
    source_name: sourceName,
    sender_or_app: email.sender,
    title: email.subject,
    body: email.body,
    received_at: email.received_at,
    external_source_id: email.message_id,
    processed_status: "pending",
    error_message: null,
    created_at: now,
  };
}
