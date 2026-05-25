import type { RawEvent } from "@ai-budget/core";
import type { ParsedEmail, EmailCollector } from "./email-types.js";
import { emailToRawEvent } from "./email-parser.js";

export class GmailCollector implements EmailCollector {
  // TODO: Phase 5 — implement real Gmail API fetching.
  // Required setup:
  //   1. Create a Google Cloud project and enable the Gmail API.
  //   2. Create OAuth 2.0 credentials (desktop application).
  //   3. Set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN in .env.
  //   4. Use google-auth-library to obtain access tokens.
  //   5. Use googleapis (gmail v1) to fetch messages.
  //
  // Implementation plan:
  //   1. Authenticate via OAuth 2.0 and store/refresh tokens.
  //   2. Call users.messages.list with q=is:unread to find payment emails.
  //   3. For each message, call users.messages.get to retrieve full MIME content.
  //   4. Parse MIME parts to extract plain-text or HTML body.
  //   5. Convert each message to a ParsedEmail.
  //   6. Mark messages as read or apply a label to avoid re-processing.
  //
  // Key fields to capture per message:
  //   - message_id (Gmail message ID, stable across API calls)
  //   - thread_id (for grouping related messages)
  //   - sender (From header)
  //   - subject (Subject header)
  //   - body (plain-text or stripped HTML body)
  //   - received_at (Date header or internalDate)

  async fetchUnprocessed(): Promise<ParsedEmail[]> {
    // TODO: Connect to Gmail API and fetch unread payment emails.
    // For now, return empty — no real API calls.
    return [];
  }

  toRawEvent(email: ParsedEmail, sourceName: string): RawEvent {
    return emailToRawEvent(email, sourceName);
  }
}
