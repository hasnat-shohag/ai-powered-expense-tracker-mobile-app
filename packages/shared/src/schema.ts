import { z } from "zod";

/** Capture source. */
export const sourceSchema = z.enum(["text", "image", "voice"]);
export type Source = z.infer<typeof sourceSchema>;

/** Sync operation kind for the outbox. */
export const opSchema = z.enum(["create", "update", "delete"]);
export type Op = z.infer<typeof opSchema>;

/**
 * One expense as returned by the LLM parse step.
 *
 * The model does NOT invent ids, group ids, or store-time timestamps — the
 * backend injects those. `spentAt` is an absolute ISO-8601 UTC instant that the
 * model resolves using the current time + timezone injected into the prompt.
 */
export const parsedExpenseSchema = z.object({
  amount: z.coerce.number().finite().nonnegative(),
  currency: z.string().trim().min(1).default("BDT"),
  category: z.string().trim().min(1),
  merchant: z.string().trim().default(""),
  description: z.string().trim().default(""),
  paymentMethod: z.string().trim().min(1).nullable().default(null),
  spentAt: z.string().datetime({ offset: true }),
});
export type ParsedExpense = z.infer<typeof parsedExpenseSchema>;

/** LLM parse output: always an array (a receipt with N line items → N rows). */
export const parseResultSchema = z.array(parsedExpenseSchema);
export type ParseResult = z.infer<typeof parseResultSchema>;

/**
 * Canonical expense row shared by app + backend. Timestamps are ISO-8601 UTC
 * strings on the wire; the DB layer maps them to `timestamptz`.
 */
export const expenseSchema = z.object({
  id: z.string().uuid(),
  groupId: z.string().uuid(),
  amount: z.coerce.number().finite().nonnegative(),
  currency: z.string().trim().min(1).default("BDT"),
  category: z.string().trim().min(1),
  merchant: z.string().trim().default(""),
  description: z.string().trim().default(""),
  paymentMethod: z.string().trim().min(1).nullable().default(null),
  source: sourceSchema,
  rawInput: z.string().default(""),
  receiptKey: z.string().nullable().default(null),
  spentAt: z.string().datetime({ offset: true }),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  deletedAt: z.string().datetime({ offset: true }).nullable().default(null),
});
export type Expense = z.infer<typeof expenseSchema>;

/** A single push operation drained from the mobile outbox. */
export const syncPushOpSchema = z.object({
  op: opSchema,
  expense: expenseSchema,
});
export type SyncPushOp = z.infer<typeof syncPushOpSchema>;

/** POST /sync request body. */
export const syncRequestSchema = z.object({
  // ISO-8601 UTC cursor; null on first sync (pull everything).
  since: z.string().datetime({ offset: true }).nullable().default(null),
  ops: z.array(syncPushOpSchema).default([]),
});
export type SyncRequest = z.infer<typeof syncRequestSchema>;

/** POST /sync response body. */
export const syncResponseSchema = z.object({
  // Rows changed on the server since `since` (includes tombstones).
  changed: z.array(expenseSchema),
  // New cursor to persist for the next pull.
  cursor: z.string().datetime({ offset: true }),
});
export type SyncResponse = z.infer<typeof syncResponseSchema>;

/** POST /parse request body (one entry per pending capture). */
export const parseRequestSchema = z.object({
  captures: z
    .array(
      z.object({
        // Echoed back so the client can map results to the local capture.
        clientId: z.string().min(1),
        source: sourceSchema,
        text: z.string().default(""),
        // base64 JPEG for image captures (no data: prefix).
        imageBase64: z.string().optional(),
      }),
    )
    .min(1),
});
export type ParseRequest = z.infer<typeof parseRequestSchema>;

/** One capture's parse result, grouped under a server-assigned groupId. */
export const parsedGroupSchema = z.object({
  clientId: z.string(),
  groupId: z.string().uuid(),
  receiptKey: z.string().nullable().default(null),
  expenses: z.array(expenseSchema),
});
export type ParsedGroup = z.infer<typeof parsedGroupSchema>;

/** POST /parse response body. */
export const parseResponseSchema = z.object({
  groups: z.array(parsedGroupSchema),
});
export type ParseResponse = z.infer<typeof parseResponseSchema>;
