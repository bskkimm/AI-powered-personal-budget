import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { join } from "node:path";

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const dbPath = process.env.DATABASE_URL?.replace("file:", "") ?? ":memory:";
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
  }
  return db;
}

export function createTestDb(): Database.Database {
  const testDb = new Database(":memory:");
  testDb.pragma("foreign_keys = ON");
  const schemaPath = join(import.meta.dirname, "..", "..", "..", "db", "schema.sql");
  const schema = readFileSync(schemaPath, "utf-8");
  testDb.exec(schema);
  return testDb;
}

export function initSchema(database?: Database.Database): void {
  const target = database ?? getDb();
  const schemaPath = join(import.meta.dirname, "..", "..", "..", "db", "schema.sql");
  const schema = readFileSync(schemaPath, "utf-8");
  target.exec(schema);
}
