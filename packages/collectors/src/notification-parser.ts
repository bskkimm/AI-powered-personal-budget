import type { RawEvent } from "@ai-budget/core";
import type { AndroidNotificationPayload } from "./notification-types.js";
import { createHash } from "node:crypto";

export function notificationToRawEvent(
  payload: AndroidNotificationPayload,
): RawEvent {
  const now = new Date().toISOString();

  const rawEventId = `evt_${createHash("sha256")
    .update(payload.notification_key)
    .digest("hex")
    .slice(0, 12)}`;

  return {
    raw_event_id: rawEventId,
    source_channel: "phone_notification",
    source_name: payload.app_name,
    sender_or_app: payload.package_name,
    title: payload.title,
    body: payload.body,
    received_at: payload.posted_time,
    external_source_id: payload.notification_key,
    processed_status: "pending",
    error_message: null,
    created_at: now,
  };
}
