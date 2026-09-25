import type { VercelRequest, VercelResponse } from "@vercel/node";
import { and, gt, sql } from "drizzle-orm";
import {
  syncRequestSchema,
  expenseSchema,
  type Expense,
  type SyncResponse,
} from "@expense/shared";
import { db as dbSchema } from "@expense/shared";
import { requireAuth } from "../lib/auth.js";
import { getDb } from "../lib/db.js";

const { expenses } = dbSchema;

/**
 * POST /api/sync — push local outbox ops, then pull remote changes.
 *
 * Conflict policy: last-write-wins by `updated_at` (single user, rare
 * conflicts). Deletes are soft (tombstone via `deleted_at`) and propagate both
 * ways. Neon's HTTP driver is single-statement, so ops are applied one at a
 * time; each write is idempotent and LWW-guarded, so a partial run is safe to
 * retry.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireAuth(req, res)) return;
  if (req.method !== "POST") {
    res.status(405).json({ error: "method not allowed" });
    return;
  }

  const parsed = syncRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "bad request", issues: parsed.error.issues });
    return;
  }

  const db = getDb();

  try {
    // ---- Push: apply each op with an updated_at-guarded upsert. ----
    for (const { op, expense } of parsed.data.ops) {
      const row = toRow(expense, op === "delete");
      await db
        .insert(expenses)
        .values(row)
        .onConflictDoUpdate({
          target: expenses.id,
          set: {
            groupId: row.groupId,
            amount: row.amount,
            currency: row.currency,
            category: row.category,
            merchant: row.merchant,
            description: row.description,
            paymentMethod: row.paymentMethod,
            source: row.source,
            rawInput: row.rawInput,
            receiptKey: row.receiptKey,
            spentAt: row.spentAt,
            updatedAt: row.updatedAt,
            deletedAt: row.deletedAt,
          },
          // Last-write-wins: only overwrite when the incoming row is newer.
          setWhere: sql`${expenses.updatedAt} <= ${row.updatedAt}`,
        });
    }

    // ---- Pull: rows changed since the cursor (tombstones included). ----
    const since = parsed.data.since ? new Date(parsed.data.since) : null;
    const changedRows = await db
      .select()
      .from(expenses)
      .where(since ? and(gt(expenses.updatedAt, since)) : undefined);

    const changed = changedRows.map(fromRow);
    const cursor = changed.reduce(
      (max, e) => (e.updatedAt > max ? e.updatedAt : max),
      since ? since.toISOString() : new Date(0).toISOString(),
    );

    const body: SyncResponse = { changed, cursor: new Date(cursor).toISOString() };
    res.status(200).json(body);
  } catch (err) {
    res.status(500).json({ error: "sync failed", detail: String(err) });
  }
}

/** Wire Expense → DB insert values. */
function toRow(e: Expense, isDelete: boolean) {
  return {
    id: e.id,
    groupId: e.groupId,
    amount: e.amount.toFixed(2),
    currency: e.currency,
    category: e.category,
    merchant: e.merchant,
    description: e.description,
    paymentMethod: e.paymentMethod,
    source: e.source,
    rawInput: e.rawInput,
    receiptKey: e.receiptKey,
    spentAt: new Date(e.spentAt),
    createdAt: new Date(e.createdAt),
    updatedAt: new Date(e.updatedAt),
    deletedAt: isDelete
      ? new Date(e.deletedAt ?? e.updatedAt)
      : e.deletedAt
        ? new Date(e.deletedAt)
        : null,
  };
}

/** DB row → wire Expense (validated). */
function fromRow(r: typeof expenses.$inferSelect): Expense {
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
