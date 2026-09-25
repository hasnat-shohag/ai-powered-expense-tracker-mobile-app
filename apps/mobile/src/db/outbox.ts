import type * as SQLite from "expo-sqlite";
import type { Expense, Op, SyncPushOp } from "@expense/shared";
import { getDb } from "./database";
import { newId, nowIso } from "./ids";

/**
 * Append one mutation to the outbox. Called INSIDE an open transaction
 * alongside the local write it mirrors, so a row and its sync op commit
 * atomically. `payload` is the full expense JSON the backend expects.
 */
export async function enqueueOp(
  db: SQLite.SQLiteDatabase,
  op: Op,
  expense: Expense,
): Promise<void> {
  await db.runAsync(
    "INSERT INTO outbox (id, op, expense_id, payload, created_at) VALUES (?, ?, ?, ?, ?)",
    [newId(), op, expense.id, JSON.stringify(expense), nowIso()],
  );
}

interface OutboxRow {
  id: string;
  op: string;
  expense_id: string;
  payload: string;
  created_at: string;
}

/** A drained outbox entry: the local row id plus the push op for /sync. */
export interface OutboxEntry {
  rowId: string;
  push: SyncPushOp;
}

/** All queued ops, oldest first — the order they must be pushed. */
export async function listOutbox(): Promise<OutboxEntry[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<OutboxRow>(
    "SELECT id, op, expense_id, payload, created_at FROM outbox ORDER BY created_at ASC, id ASC",
  );
  return rows.map((r) => ({
    rowId: r.id,
    push: { op: r.op as Op, expense: JSON.parse(r.payload) as Expense },
  }));
}

/** Remove pushed entries by their local outbox row ids. */
export async function removeOutbox(rowIds: string[]): Promise<void> {
  if (rowIds.length === 0) return;
  const db = await getDb();
  const placeholders = rowIds.map(() => "?").join(", ");
  await db.runAsync(
    `DELETE FROM outbox WHERE id IN (${placeholders})`,
    rowIds,
  );
}

/** Count of unsynced mutations (drives a "pending sync" indicator). */
export async function outboxCount(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>(
    "SELECT COUNT(*) AS n FROM outbox",
  );
  return row?.n ?? 0;
}
