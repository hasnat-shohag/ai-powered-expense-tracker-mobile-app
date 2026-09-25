import { getDb } from "./database";

/** Read a value from the local key/value meta table, or null. */
export async function getMeta(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_meta WHERE key = ?",
    [key],
  );
  return row?.value ?? null;
}

/** Write (upsert) a value into the local key/value meta table. */
export async function setMeta(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)",
    [key, value],
  );
}

/** Meta key holding the last successful sync pull cursor (ISO-8601 UTC). */
export const SYNC_CURSOR_KEY = "sync.cursor";
