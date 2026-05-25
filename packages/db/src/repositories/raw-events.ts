import type Database from "better-sqlite3";
import type { RawEvent, ProcessedStatus } from "@ai-budget/core";

interface RawEventRow {
  raw_event_id: string;
  source_channel: string;
  source_name: string | null;
  sender_or_app: string | null;
  title: string | null;
  body: string;
  received_at: string;
  external_source_id: string | null;
  processed_status: string;
  error_message: string | null;
  created_at: string;
}

function rowToRawEvent(row: RawEventRow): RawEvent {
  let body: string | Record<string, unknown>;
  try {
    body = JSON.parse(row.body);
  } catch {
    body = row.body;
  }
  return {
    raw_event_id: row.raw_event_id,
    source_channel: row.source_channel as RawEvent["source_channel"],
    source_name: row.source_name,
    sender_or_app: row.sender_or_app,
    title: row.title,
    body,
    received_at: row.received_at,
    external_source_id: row.external_source_id,
    processed_status: row.processed_status as ProcessedStatus,
    error_message: row.error_message,
    created_at: row.created_at,
  };
}

export function insertRawEvent(db: Database.Database, event: RawEvent): void {
  const bodyStr =
    typeof event.body === "string" ? event.body : JSON.stringify(event.body);
  db.prepare(
    `INSERT INTO raw_events (
      raw_event_id, source_channel, source_name, sender_or_app, title,
      body, received_at, external_source_id, processed_status,
      error_message, created_at
    ) VALUES (
      @raw_event_id, @source_channel, @source_name, @sender_or_app, @title,
      @body, @received_at, @external_source_id, @processed_status,
      @error_message, @created_at
    )`,
  ).run({
    raw_event_id: event.raw_event_id,
    source_channel: event.source_channel,
    source_name: event.source_name,
    sender_or_app: event.sender_or_app,
    title: event.title,
    body: bodyStr,
    received_at: event.received_at,
    external_source_id: event.external_source_id,
    processed_status: event.processed_status,
    error_message: event.error_message,
    created_at: event.created_at,
  });
}

export function getRawEventById(
  db: Database.Database,
  id: string,
): RawEvent | null {
  const row = db
    .prepare("SELECT * FROM raw_events WHERE raw_event_id = ?")
    .get(id) as RawEventRow | undefined;
  return row ? rowToRawEvent(row) : null;
}

export function listPendingRawEvents(db: Database.Database): RawEvent[] {
  const rows = db
    .prepare("SELECT * FROM raw_events WHERE processed_status = 'pending' ORDER BY received_at ASC")
    .all() as RawEventRow[];
  return rows.map(rowToRawEvent);
}

export function updateRawEventStatus(
  db: Database.Database,
  id: string,
  status: ProcessedStatus,
  errorMessage?: string | null,
): void {
  db.prepare(
    `UPDATE raw_events SET processed_status = ?, error_message = ? WHERE raw_event_id = ?`,
  ).run(status, errorMessage ?? null, id);
}
