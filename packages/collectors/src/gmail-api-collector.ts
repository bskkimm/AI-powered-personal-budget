import type { ParsedEmail, EmailCollector } from "./email-types.js";
import type { RawEvent } from "@ai-budget/core";
import { emailToRawEvent } from "./email-parser.js";

export class GmailApiCollector implements EmailCollector {
  private accessToken: string | null = null;
  private clientId: string;
  private clientSecret: string;
  private refreshToken: string;

  constructor(clientId: string, clientSecret: string, refreshToken: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.refreshToken = refreshToken;
  }

  async authenticate(): Promise<void> {
    // Gmail API OAuth 2.0 token refresh
    // Install: pnpm add googleapis google-auth-library
    //
    // import { google } from "googleapis";
    // import { OAuth2Client } from "google-auth-library";
    //
    // const oauth2Client = new OAuth2Client(
    //   this.clientId,
    //   this.clientSecret,
    //   "http://localhost",
    // );
    // oauth2Client.setCredentials({
    //   refresh_token: this.refreshToken,
    // });
    // const { token } = await oauth2Client.getAccessToken();
    // this.accessToken = token ?? null;
    //
    // For now, authentication is deferred until googleapis is installed.
    throw new Error(
      "GmailApiCollector.authenticate() requires googleapis and google-auth-library packages. Install them first.",
    );
  }

  async fetchUnprocessed(): Promise<ParsedEmail[]> {
    if (!this.accessToken) {
      await this.authenticate();
    }

    // Gmail API fetch logic (requires googleapis):
    //
    // import { google } from "googleapis";
    // const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    //
    // const listResponse = await gmail.users.messages.list({
    //   userId: "me",
    //   q: "is:unread category:purchases OR category:promotions",
    //   maxResults: 50,
    // });
    //
    // const messages = listResponse.data.messages ?? [];
    // const emails: ParsedEmail[] = [];
    //
    // for (const msg of messages) {
    //   const full = await gmail.users.messages.get({
    //     userId: "me",
    //     id: msg.id!,
    //     format: "full",
    //   });
    //
    //   const headers = full.data.payload?.headers ?? [];
    //   const subject = headers.find((h) => h.name === "Subject")?.value ?? "";
    //   const from = headers.find((h) => h.name === "From")?.value ?? "";
    //   const date = headers.find((h) => h.name === "Date")?.value ?? "";
    //   const messageId = headers.find((h) => h.name === "Message-ID")?.value ?? msg.id!;
    //
    //   const body = this.decodeBody(full.data.payload);
    //
    //   emails.push({
    //     message_id: messageId,
    //     thread_id: full.data.threadId ?? null,
    //     sender: from,
    //     subject,
    //     body,
    //     received_at: new Date(Number(full.data.internalDate)).toISOString(),
    //   });
    //
    //   // Mark as read to avoid re-processing
    //   await gmail.users.messages.modify({
    //     userId: "me",
    //     id: msg.id!,
    //     requestBody: { removeLabelIds: ["UNREAD"] },
    //   });
    // }
    //
    // return emails;

    throw new Error(
      "GmailApiCollector.fetchUnprocessed() requires googleapis package. Install it first.",
    );
  }

  toRawEvent(email: ParsedEmail, sourceName: string): RawEvent {
    return emailToRawEvent(email, sourceName);
  }
}
