import type { RawEvent } from "@ai-budget/core";
import { insertRawEvent, getRawEventById } from "@ai-budget/db";
import type Database from "better-sqlite3";
import { createHash } from "node:crypto";

export interface WebhookInput {
  package_name: string;
  app_name: string | null;
  title: string;
  body: string;
  posted_time: string;
  notification_key: string;
  secret: string;
}

export interface WebhookResult {
  success: boolean;
  raw_event_id: string | null;
  error: string | null;
}

export function handleAndroidWebhook(
  db: Database.Database,
  input: WebhookInput,
  expectedSecret?: string,
): WebhookResult {
  if (expectedSecret && input.secret !== expectedSecret) {
    return { success: false, raw_event_id: null, error: "Unauthorized: invalid webhook secret" };
  }

  if (!input.package_name || !input.body || !input.notification_key) {
    return {
      success: false,
      raw_event_id: null,
      error: "Missing required fields: package_name, body, notification_key",
    };
  }

  const rawEventId = `evt_${createHash("sha256")
    .update(input.notification_key)
    .digest("hex")
    .slice(0, 12)}`;

  const now = new Date().toISOString();

  const event: RawEvent = {
    raw_event_id: rawEventId,
    source_channel: "phone_notification",
    source_name: input.app_name,
    sender_or_app: input.package_name,
    title: input.title,
    body: input.body,
    received_at: input.posted_time,
    external_source_id: input.notification_key,
    processed_status: "pending",
    error_message: null,
    created_at: now,
  };

  const existing = getRawEventById(db, rawEventId);
  if (existing) {
    return { success: true, raw_event_id: rawEventId, error: null };
  }

  insertRawEvent(db, event);

  return { success: true, raw_event_id: rawEventId, error: null };
}
