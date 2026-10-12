import { EXPENSE_COLUMNS } from "./mappers";

/**
 * Pure, framework-free query helpers for the local ledger — Dhaka month math
 * and the History search SQL builder. Kept free of any `expo-sqlite` import so
 * it loads (and is unit-testable) under Node.
 */

/** Asia/Dhaka is a fixed +06:00 offset (no DST). Display + month math use it. */
export const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;

/** {year, month} where month is 1–12, interpreted in Asia/Dhaka local time. */
export interface MonthKey {
  year: number;
  month: number;
}

/** UTC [start, end) instants bounding a Dhaka-local calendar month. */
export function monthRangeUtc(m: MonthKey): { start: string; end: string } {
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

/** Filters for the History screen's search + filter bar. */
export interface ExpenseFilters {
  month?: MonthKey;
  from?: string;
  to?: string;
  category?: string;
  /** A payment method, or the literal "unknown" to match NULL. */
  paymentMethod?: string;
  search?: string;
}

/**
 * Pure builder: turn History filters into a parameterized SELECT over active
 * rows, newest first, keyset-paginated by `spent_at`. Extracted so it is
 * unit-testable without a SQLite runtime.
 */
export function buildSearchSql(
  filters: ExpenseFilters,
  limit: number,
  cursorSpentAt?: string,
): { sql: string; args: (string | number)[] } {
  const where: string[] = ["deleted_at IS NULL"];
  const args: (string | number)[] = [];

  if (filters.month) {
    const { start, end } = monthRangeUtc(filters.month);
    where.push("spent_at >= ? AND spent_at < ?");
    args.push(start, end);
  } else {
    if (filters.from) {
      where.push("spent_at >= ?");
      args.push(filters.from);
    }
    if (filters.to) {
      where.push("spent_at < ?");
      args.push(filters.to);
    }
  }
  if (filters.category) {
    where.push("category = ?");
    args.push(filters.category);
  }
  if (filters.paymentMethod) {
    if (filters.paymentMethod === "unknown") {
      where.push("payment_method IS NULL");
    } else {
      where.push("payment_method = ?");
      args.push(filters.paymentMethod);
    }
  }
  if (filters.search) {
    const needle = `%${filters.search}%`;
    where.push(
      "(merchant LIKE ? OR description LIKE ? OR category LIKE ? OR raw_input LIKE ?)",
    );
    args.push(needle, needle, needle, needle);
  }
  if (cursorSpentAt) {
    where.push("spent_at < ?");
    args.push(cursorSpentAt);
  }

  const sql =
    `SELECT ${EXPENSE_COLUMNS} FROM expenses WHERE ${where.join(" AND ")} ` +
    `ORDER BY spent_at DESC, id DESC LIMIT ?`;
  args.push(limit);
  return { sql, args };
}
