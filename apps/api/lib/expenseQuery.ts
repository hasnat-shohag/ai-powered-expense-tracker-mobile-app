import { and, eq, gte, ilike, isNull, lt, or, sql, type SQL } from "drizzle-orm";
import { db as dbSchema, expenseSchema, type Expense } from "@expense/shared";
import type { ExpenseQuery } from "@expense/shared";

const { expenses } = dbSchema;

/**
 * Build the shared WHERE conditions for owner-scoped expense reads (list +
 * summary), from a validated query. The time window is resolved in the user's
 * timezone when `month` is given (via Postgres `AT TIME ZONE`, parameterized so
 * a user-set tz can't inject SQL); otherwise from/to UTC instants are used.
 * `tz` and `month` are passed as bind params.
 */
export function expenseConditions(
  ownerId: string,
  q: ExpenseQuery,
  tz: string,
): SQL[] {
  const conds: SQL[] = [eq(expenses.ownerId, ownerId), isNull(expenses.deletedAt)];

  if (q.month) {
    // Local month boundaries → UTC instants.
    const start = sql`((${q.month} || '-01')::timestamp AT TIME ZONE ${tz})`;
    conds.push(sql`${expenses.spentAt} >= ${start}`);
    conds.push(sql`${expenses.spentAt} < ${start} + interval '1 month'`);
  } else {
    if (q.from) conds.push(gte(expenses.spentAt, new Date(q.from)));
    if (q.to) conds.push(lt(expenses.spentAt, new Date(q.to)));
  }

  if (q.category) conds.push(eq(expenses.category, q.category));
  if (q.paymentMethod) conds.push(eq(expenses.paymentMethod, q.paymentMethod));

  if (q.search) {
    const needle = `%${q.search}%`;
    const match = or(
      ilike(expenses.merchant, needle),
      ilike(expenses.description, needle),
      ilike(expenses.category, needle),
      ilike(expenses.rawInput, needle),
    );
    if (match) conds.push(match);
  }

  return conds;
}

/** Convenience: fold the conditions into a single ANDed clause. */
export function expenseWhere(ownerId: string, q: ExpenseQuery, tz: string) {
  return and(...expenseConditions(ownerId, q, tz));
}

/** DB row → wire Expense (validated; owner_id is stripped by the schema). */
export function rowToExpense(r: typeof expenses.$inferSelect): Expense {
  return expenseSchema.parse({
    id: r.id,
    groupId: r.groupId,
    amount: Number(r.amount),
    currency: r.currency,
    category: r.category,
    merchant: r.merchant,
    description: r.description,
    paymentMethod: r.paymentMethod,
    source: r.source,
    rawInput: r.rawInput,
    receiptKey: r.receiptKey,
    spentAt: r.spentAt.toISOString(),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    deletedAt: r.deletedAt ? r.deletedAt.toISOString() : null,
  });
}
