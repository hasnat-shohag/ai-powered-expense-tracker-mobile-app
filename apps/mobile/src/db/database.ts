import * as SQLite from "expo-sqlite";
import { migrations, TARGET_VERSION } from "./migrations";

const DB_NAME = "expense-tracker.db";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Open (once) the local database and run any outstanding migrations. The
 * handle is a process-wide singleton: every query module awaits this.
 */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = openAndMigrate();
  }
  return dbPromise;
}

async function openAndMigrate(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  // WAL for concurrent reads during a write; foreign keys on for future FKs.
  await db.execAsync("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  await migrate(db);
  return db;
}

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version;",
  );
  const current = row?.user_version ?? 0;
  if (current >= TARGET_VERSION) return;

  for (let version = current; version < TARGET_VERSION; version++) {
    const sql = migrations[version];
    if (!sql) continue;
    await db.withTransactionAsync(async () => {
      await db.execAsync(sql);
    });
    // PRAGMA user_version does not accept bound params.
    await db.execAsync(`PRAGMA user_version = ${version + 1};`);
  }
}

/** Test/hard-reset hook: drop the cached handle so the next getDb re-opens. */
export function resetDbHandle(): void {
  dbPromise = null;
}
