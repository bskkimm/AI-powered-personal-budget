export type SourceChannel = "email" | "phone_notification" | "manual";

export type ProcessedStatus = "pending" | "processed" | "failed";

export interface RawEvent {
  raw_event_id: string;
  source_channel: SourceChannel;
  source_name: string | null;
  sender_or_app: string | null;
  title: string | null;
  body: string | Record<string, unknown>;
  received_at: string;
  external_source_id: string | null;
  processed_status: ProcessedStatus;
  error_message: string | null;
  created_at: string;
}
