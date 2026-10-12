import type { Expense, ExpenseSummaryResponse } from "@expense/shared";
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
import {
  buildSearchSql,
  currentMonthKey,
  monthRangeUtc,
  previousMonth,
  type ExpenseFilters,
  type MonthKey,
} from "./searchSql";

// Re-export the pure query helpers so existing importers (db/index.ts, screens)
// keep their import path.
export {
  buildSearchSql,
  currentMonthKey,
  previousMonth,
  type ExpenseFilters,
  type MonthKey,
};

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
async function getExpense(id: string): Promise<Expense | null> {
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

/** Run a filtered, keyset-paginated History query against local SQLite. */
export async function searchExpenses(
  filters: ExpenseFilters,
  limit = 30,
  cursorSpentAt?: string,
): Promise<Expense[]> {
  const db = await getDb();
  const { sql, args } = buildSearchSql(filters, limit, cursorSpentAt);
  const rows = await db.getAllAsync<ExpenseRow>(sql, args);
  return rows.map(rowToExpense);
}

/** Distinct non-empty categories across active rows (for filter chips). */
export async function distinctCategories(): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ category: string }>(
    "SELECT DISTINCT category FROM expenses WHERE deleted_at IS NULL AND category <> '' ORDER BY category",
  );
  return rows.map((r) => r.category);
}

/** Distinct payment methods across active rows ('unknown' for NULL). */
export async function distinctPaymentMethods(): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ pm: string }>(
    "SELECT DISTINCT COALESCE(payment_method, 'unknown') AS pm FROM expenses WHERE deleted_at IS NULL ORDER BY pm",
  );
  return rows.map((r) => r.pm);
}

/** Range for the Insights screen: a Dhaka month, an explicit window, or all. */
export type SummaryRange =
  | { kind: "month"; month: MonthKey }
  | { kind: "range"; from: string; to: string }
  | { kind: "all" };

function rangeBounds(range: SummaryRange): { start?: string; end?: string } {
  if (range.kind === "month") return monthRangeUtc(range.month);
  if (range.kind === "range") return { start: range.from, end: range.to };
  return {};
}

/**
 * Local analytics over a range: grand total + count, per-category and
 * per-payment-method breakdowns, and a daily series (Dhaka-local days via the
 * +6h shift). Mirrors the server `/expenses/summary` shape so the Insights UI
 * could later swap sources without changing. Offline-first: reads SQLite only.
 */
export async function summarize(
  range: SummaryRange,
): Promise<ExpenseSummaryResponse> {
  const db = await getDb();
  const { start, end } = rangeBounds(range);
  const where: string[] = ["deleted_at IS NULL"];
  const args: string[] = [];
  if (start) {
    where.push("spent_at >= ?");
    args.push(start);
  }
  if (end) {
    where.push("spent_at < ?");
    args.push(end);
  }
  const W = where.join(" AND ");

  const totals = await db.getFirstAsync<{
    total: number | null;
    count: number;
    currency: string | null;
  }>(
    `SELECT SUM(amount) AS total, COUNT(*) AS count, MAX(currency) AS currency FROM expenses WHERE ${W}`,
    args,
  );
  const byCategory = await db.getAllAsync<{
    key: string;
    total: number;
    count: number;
  }>(
    `SELECT category AS key, SUM(amount) AS total, COUNT(*) AS count FROM expenses WHERE ${W} GROUP BY category ORDER BY total DESC`,
    args,
  );
  const byPaymentMethod = await db.getAllAsync<{
    key: string;
    total: number;
    count: number;
  }>(
    `SELECT COALESCE(payment_method, 'unknown') AS key, SUM(amount) AS total, COUNT(*) AS count FROM expenses WHERE ${W} GROUP BY key ORDER BY total DESC`,
    args,
  );
  const daily = await db.getAllAsync<{ day: string; total: number; count: number }>(
    `SELECT date(spent_at, '+6 hours') AS day, SUM(amount) AS total, COUNT(*) AS count FROM expenses WHERE ${W} GROUP BY day ORDER BY day`,
    args,
  );

  return {
    total: totals?.total ?? 0,
    count: totals?.count ?? 0,
    currency: totals?.currency ?? "BDT",
    byCategory,
    byPaymentMethod,
    daily,
  };
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

  // Fetch all local updated_at timestamps in one query instead of a point
  // read per row (N+1). Compare last-write-wins in memory, then write only the
  // rows that are actually newer.
  const placeholders = rows.map(() => "?").join(",");
  const localRows = await db.getAllAsync<{ id: string; updated_at: string }>(
    `SELECT id, updated_at FROM expenses WHERE id IN (${placeholders})`,
    rows.map((e) => e.id),
  );
  const localById = new Map(localRows.map((r) => [r.id, r.updated_at]));

  const toWrite = rows.filter((e) => {
    const localUpdatedAt = localById.get(e.id);
    return !(localUpdatedAt !== undefined && localUpdatedAt >= e.updatedAt);
  });
  if (toWrite.length === 0) return;

  await db.withTransactionAsync(async () => {
    for (const e of toWrite) {
      await db.runAsync(INSERT_SQL, expenseToBindings(e));
    }
  });
}
