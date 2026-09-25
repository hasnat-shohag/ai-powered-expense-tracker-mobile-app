import type { Expense } from "@expense/shared";
import { getDb } from "./database";
import { nowIso } from "./ids";
import {
  EXPENSE_COLUMNS,
  EXPENSE_PLACEHOLDERS,
  expenseToBindings,
  rowToExpense,
  type ExpenseRow,
} from "./mappers";
import { enqueueOp } from "./outbox";

/** Asia/Dhaka is a fixed +06:00 offset (no DST). Display + month math use it. */
const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;

/** Fields a user may edit on a confirmed expense. */
export type ExpensePatch = Partial<
  Pick<
    Expense,
    | "amount"
    | "currency"
    | "category"
    | "merchant"
    | "description"
    | "paymentMethod"
    | "spentAt"
  >
>;

/** {year, month} where month is 1–12, interpreted in Asia/Dhaka local time. */
export interface MonthKey {
  year: number;
  month: number;
}

/** UTC [start, end) instants bounding a Dhaka-local calendar month. */
function monthRangeUtc(m: MonthKey): { start: string; end: string } {
  const startMs = Date.UTC(m.year, m.month - 1, 1) - DHAKA_OFFSET_MS;
  const endMs = Date.UTC(m.year, m.month, 1) - DHAKA_OFFSET_MS;
  return { start: new Date(startMs).toISOString(), end: new Date(endMs).toISOString() };
}

/** The current Dhaka-local calendar month. */
export function currentMonthKey(now: Date = new Date()): MonthKey {
  const dhaka = new Date(now.getTime() + DHAKA_OFFSET_MS);
  return { year: dhaka.getUTCFullYear(), month: dhaka.getUTCMonth() + 1 };
}

/** The month before `m`, rolling the year at the January boundary. */
export function previousMonth(m: MonthKey): MonthKey {
  return m.month === 1
    ? { year: m.year - 1, month: 12 }
    : { year: m.year, month: m.month - 1 };
}


const INSERT_SQL = `INSERT OR REPLACE INTO expenses (${EXPENSE_COLUMNS}) VALUES (${EXPENSE_PLACEHOLDERS})`;

/**
 * Save confirmed draft rows: write each to the local mirror and append a
 * matching `create` op to the outbox, all in one transaction. This is the
 * commit step after the user reviews a parsed draft (Phase 9).
 */
export async function createExpenses(rows: Expense[]): Promise<void> {
  if (rows.length === 0) return;
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const e of rows) {
      await db.runAsync(INSERT_SQL, expenseToBindings(e));
      await enqueueOp(db, "create", e);
    }
  });
}

/** Fetch one expense by id (including a tombstoned row), or null. */
export async function getExpense(id: string): Promise<Expense | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<ExpenseRow>(
    `SELECT ${EXPENSE_COLUMNS} FROM expenses WHERE id = ?`,
    [id],
  );
  return row ? rowToExpense(row) : null;
}

/**
 * Apply an offline edit: patch the row, bump `updated_at` (drives LWW), and
 * enqueue an `update` op. Returns the updated expense, or null if it is gone.
 */
export async function updateExpense(
  id: string,
  patch: ExpensePatch,
): Promise<Expense | null> {
  const db = await getDb();
  const existing = await getExpense(id);
  if (!existing) return null;
  const updated: Expense = { ...existing, ...patch, updatedAt: nowIso() };
  await db.withTransactionAsync(async () => {
    await db.runAsync(INSERT_SQL, expenseToBindings(updated));
    await enqueueOp(db, "update", updated);
  });
  return updated;
}

/**
 * Soft-delete: set the tombstone + `updated_at` and enqueue a `delete` op.
 * The row stays local so the tombstone can propagate on the next sync.
 */
export async function softDeleteExpense(id: string): Promise<void> {
  const db = await getDb();
  const existing = await getExpense(id);
  if (!existing || existing.deletedAt) return;
  const ts = nowIso();
  const tombstoned: Expense = { ...existing, deletedAt: ts, updatedAt: ts };
  await db.withTransactionAsync(async () => {
    await db.runAsync(INSERT_SQL, expenseToBindings(tombstoned));
    await enqueueOp(db, "delete", tombstoned);
  });
}

/**
 * List active (non-tombstoned) expenses, newest spend first. Pass a month to
 * scope to a Dhaka-local calendar month; omit `limit` for the full ledger.
 */
export async function listExpenses(opts?: {
  month?: MonthKey;
  limit?: number;
}): Promise<Expense[]> {
  const db = await getDb();
  const where: string[] = ["deleted_at IS NULL"];
  const args: (string | number)[] = [];
  if (opts?.month) {
    const { start, end } = monthRangeUtc(opts.month);
    where.push("spent_at >= ? AND spent_at < ?");
    args.push(start, end);
  }
  let sql = `SELECT ${EXPENSE_COLUMNS} FROM expenses WHERE ${where.join(" AND ")} ORDER BY spent_at DESC, id DESC`;
  if (opts?.limit != null) {
    sql += " LIMIT ?";
    args.push(opts.limit);
  }
  const rows = await db.getAllAsync<ExpenseRow>(sql, args);
  return rows.map(rowToExpense);
}

/** Total spend for a Dhaka-local month (active rows only). */
export async function monthTotal(m: MonthKey): Promise<number> {
  const db = await getDb();
  const { start, end } = monthRangeUtc(m);
  const row = await db.getFirstAsync<{ total: number | null }>(
    "SELECT SUM(amount) AS total FROM expenses WHERE deleted_at IS NULL AND spent_at >= ? AND spent_at < ?",
    [start, end],
  );
  return row?.total ?? 0;
}

/** Per-category totals for a month, largest first (drives the donut + legend). */
export async function categoryBreakdown(
  m: MonthKey,
): Promise<{ category: string; total: number }[]> {
  const db = await getDb();
  const { start, end } = monthRangeUtc(m);
  return db.getAllAsync<{ category: string; total: number }>(
    "SELECT category, SUM(amount) AS total FROM expenses " +
      "WHERE deleted_at IS NULL AND spent_at >= ? AND spent_at < ? " +
      "GROUP BY category ORDER BY total DESC",
    [start, end],
  );
}

/**
 * Upsert rows pulled from the server. Last-write-wins by `updated_at`: a
 * server row is applied only when it is newer than the local copy. No outbox
 * op is written — these mutations originate remotely.
 */
export async function applyServerRows(rows: Expense[]): Promise<void> {
  if (rows.length === 0) return;
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const e of rows) {
      const local = await db.getFirstAsync<{ updated_at: string }>(
        "SELECT updated_at FROM expenses WHERE id = ?",
        [e.id],
      );
      if (local && local.updated_at >= e.updatedAt) continue;
      await db.runAsync(INSERT_SQL, expenseToBindings(e));
    }
  });
}
