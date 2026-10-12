import type { VercelRequest, VercelResponse } from "@vercel/node";
import { and, desc, sql } from "drizzle-orm";
import {
  expenseQuerySchema,
  type ExpenseSummaryResponse,
  type SummaryBucket,
  type SummaryDay,
} from "@expense/shared";
import { db as dbSchema } from "@expense/shared";
import { requireAuth } from "../../lib/auth.js";
import { getDb } from "../../lib/db.js";
import { badRequest, requireMethod, sendJson, serverError } from "../../lib/http.js";
import { ensureUser } from "../../lib/users.js";
import { expenseConditions } from "../../lib/expenseQuery.js";

const { expenses } = dbSchema;

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * GET /api/expenses/summary — owner-scoped spend analytics for the same filter
 * set as the list endpoint: grand total + count, per-category and
 * per-payment-method breakdowns, and a daily series. Day bucketing uses the
 * user's timezone (Postgres `AT TIME ZONE`). No FX — amounts are summed as-is.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAuth(req, res);
  if (!auth) return;
  if (!requireMethod(req, res, ["GET"])) return;

  const parsed = expenseQuerySchema.safeParse(req.query);
  if (!parsed.success) return badRequest(res, parsed.error);
  const q = parsed.data;

  try {
    const { user } = await ensureUser(auth.ownerId, auth.claims);
    const where = and(...expenseConditions(auth.ownerId, q, user.timezone));
    const db = getDb();

    const totals = await db
      .select({
        total: sql<string>`coalesce(sum(${expenses.amount}), 0)`,
        count: sql<number>`count(*)::int`,
        currency: sql<string | null>`max(${expenses.currency})`,
      })
      .from(expenses)
      .where(where);

    const byCategoryRows = await db
      .select({
        key: expenses.category,
        total: sql<string>`coalesce(sum(${expenses.amount}), 0)`,
        count: sql<number>`count(*)::int`,
      })
      .from(expenses)
      .where(where)
      .groupBy(expenses.category)
      .orderBy(desc(sql`sum(${expenses.amount})`));

    const pmKey = sql<string>`coalesce(${expenses.paymentMethod}, 'unknown')`;
    const byPaymentMethodRows = await db
      .select({
        key: pmKey,
        total: sql<string>`coalesce(sum(${expenses.amount}), 0)`,
        count: sql<number>`count(*)::int`,
      })
      .from(expenses)
      .where(where)
      .groupBy(pmKey)
      .orderBy(desc(sql`sum(${expenses.amount})`));

    const dayKey = sql<string>`to_char(${expenses.spentAt} AT TIME ZONE ${user.timezone}, 'YYYY-MM-DD')`;
    const dailyRows = await db
      .select({
        day: dayKey,
        total: sql<string>`coalesce(sum(${expenses.amount}), 0)`,
        count: sql<number>`count(*)::int`,
      })
      .from(expenses)
      .where(where)
      .groupBy(dayKey)
      .orderBy(dayKey);

    const toBucket = (r: { key: string; total: string; count: number }): SummaryBucket => ({
      key: r.key,
      total: num(r.total),
      count: num(r.count),
    });
    const toDay = (r: { day: string; total: string; count: number }): SummaryDay => ({
      day: r.day,
      total: num(r.total),
      count: num(r.count),
    });

    const body: ExpenseSummaryResponse = {
      total: num(totals[0]?.total),
      count: num(totals[0]?.count),
      currency: totals[0]?.currency ?? "BDT",
      byCategory: byCategoryRows.map(toBucket),
      byPaymentMethod: byPaymentMethodRows.map(toBucket),
      daily: dailyRows.map(toDay),
    };
    return sendJson(res, 200, body);
  } catch (err) {
    return serverError(res, "expenses summary failed", err);
  }
}
