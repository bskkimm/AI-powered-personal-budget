import type { RawEvent } from "@ai-budget/core";

export interface ParsedEmail {
  message_id: string;
  thread_id: string | null;
  sender: string;
  subject: string;
  body: string;
  received_at: string;
}

export interface EmailCollector {
  fetchUnprocessed(): Promise<ParsedEmail[]>;
  toRawEvent(email: ParsedEmail, sourceName: string): RawEvent;
}
