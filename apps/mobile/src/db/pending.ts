import type { Source } from "@expense/shared";
import { getDb } from "./database";
import { newId, nowIso } from "./ids";

/**
 * A raw capture recorded offline, awaiting the /parse round-trip. Text and
 * voice carry `rawText`; image captures carry a local `imagePath` (the
 * compressed JPEG in Expo FileSystem) instead.
 */
export interface PendingCapture {
  id: string;
  source: Source;
  rawText: string;
  imagePath: string | null;
  createdAt: string;
}

interface PendingRow {
  id: string;
  source: string;
  raw_text: string;
  image_path: string | null;
  created_at: string;
}

function rowToPending(r: PendingRow): PendingCapture {
  return {
    id: r.id,
    source: r.source as Source,
    rawText: r.raw_text,
    imagePath: r.image_path,
    createdAt: r.created_at,
  };
}

/** Record a capture in the local queue; returns the generated id. */
export async function addPendingCapture(input: {
  source: Source;
  rawText?: string;
  imagePath?: string | null;
}): Promise<string> {
  const db = await getDb();
  const id = newId();
  await db.runAsync(
    "INSERT INTO pending_captures (id, source, raw_text, image_path, created_at) VALUES (?, ?, ?, ?, ?)",
    [id, input.source, input.rawText ?? "", input.imagePath ?? null, nowIso()],
  );
  return id;
}

/** All queued captures, oldest first. */
export async function listPendingCaptures(): Promise<PendingCapture[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<PendingRow>(
    "SELECT id, source, raw_text, image_path, created_at FROM pending_captures ORDER BY created_at ASC, id ASC",
  );
  return rows.map(rowToPending);
}

/** Remove captures once their parse result has been saved. */
export async function removePendingCaptures(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await getDb();
  const placeholders = ids.map(() => "?").join(", ");
  await db.runAsync(
    `DELETE FROM pending_captures WHERE id IN (${placeholders})`,
    ids,
  );
}

/** Count of captures awaiting parse (drives the pending badge). */
export async function pendingCount(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>(
    "SELECT COUNT(*) AS n FROM pending_captures",
  );
  return row?.n ?? 0;
}
