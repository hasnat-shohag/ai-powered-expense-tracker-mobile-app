import type { VercelRequest, VercelResponse } from "@vercel/node";
import { and, desc, lt } from "drizzle-orm";
import {
  expenseQuerySchema,
  type ExpenseListResponse,
} from "@expense/shared";
import { db as dbSchema } from "@expense/shared";
import { requireAuth } from "../../lib/auth.js";
import { getDb } from "../../lib/db.js";
import { badRequest, requireMethod, sendJson, serverError } from "../../lib/http.js";
import { ensureUser } from "../../lib/users.js";
import { expenseConditions, rowToExpense } from "../../lib/expenseQuery.js";

const { expenses } = dbSchema;

/**
 * GET /api/expenses — owner-scoped, filterable, keyset-paginated expense list.
 *
 * Additive read surface for a richer UI (search/filters/analytics) and future
 * cross-device reads. The mobile app's SQLite mirror remains the UI source of
 * truth, and all mutations still flow through /sync. Tombstones are excluded.
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

    const conds = expenseConditions(auth.ownerId, q, user.timezone);
    // Keyset page: rows strictly older than the cursor's spent_at. spent_at is
    // sub-millisecond-unique in practice (uuidv7 captures), so boundary ties
    // are not a concern for this app's volume.
    if (q.cursor) conds.push(lt(expenses.spentAt, new Date(q.cursor)));

    const rows = await getDb()
      .select()
      .from(expenses)
      .where(and(...conds))
      .orderBy(desc(expenses.spentAt), desc(expenses.id))
      .limit(q.limit + 1);

    const hasMore = rows.length > q.limit;
    const page = hasMore ? rows.slice(0, q.limit) : rows;
    const items = page.map(rowToExpense);
    const last = page[page.length - 1];

    const body: ExpenseListResponse = {
      items,
      nextCursor: hasMore && last ? last.spentAt.toISOString() : null,
    };
    return sendJson(res, 200, body);
  } catch (err) {
    return serverError(res, "expenses list failed", err);
  }
}
