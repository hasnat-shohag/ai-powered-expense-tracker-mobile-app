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

// ---------------------------------------------------------------------------
// Accounts: user profile + subscriptions. `owner_id` on expenses stays
// server-only; these schemas are the client-facing account surface.
// ---------------------------------------------------------------------------

/** Billing plan. Capability differences are resolved via PLAN_ENTITLEMENTS. */
export const planSchema = z.enum(["free", "pro"]);
export type Plan = z.infer<typeof planSchema>;

/** Subscription lifecycle state. */
export const subscriptionStatusSchema = z.enum([
  "active",
  "trialing",
  "past_due",
  "canceled",
]);
export type SubscriptionStatus = z.infer<typeof subscriptionStatusSchema>;

/** Public user profile. `id` is the Clerk user id (same as expenses owner). */
export const userProfileSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  displayName: z.string().default(""),
  imageUrl: z.string().url().nullable().default(null),
  timezone: z.string().min(1).default("Asia/Dhaka"),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});
export type UserProfile = z.infer<typeof userProfileSchema>;

/** Current subscription as seen by the client. */
export const subscriptionSchema = z.object({
  plan: planSchema,
  status: subscriptionStatusSchema,
  currentPeriodStart: z.string().datetime({ offset: true }).nullable().default(null),
  currentPeriodEnd: z.string().datetime({ offset: true }).nullable().default(null),
  cancelAtPeriodEnd: z.boolean().default(false),
});
export type Subscription = z.infer<typeof subscriptionSchema>;

/**
 * Capability flags/limits derived from a plan. Resolved server-side and echoed
 * to the client so the UI can show/hide features without re-deriving rules.
 * `maxExpensesPerMonth: null` = unlimited.
 */
export const entitlementsSchema = z.object({
  maxExpensesPerMonth: z.number().int().positive().nullable(),
  voiceCapture: z.boolean(),
  receiptImage: z.boolean(),
  analytics: z.boolean(),
});
export type Entitlements = z.infer<typeof entitlementsSchema>;

/**
 * The one place plan capabilities are defined. This pass intentionally grants
 * every capability on both tiers (free == pro) — tighten here, nowhere else,
 * when billing is wired.
 */
export const PLAN_ENTITLEMENTS: Record<Plan, Entitlements> = {
  free: {
    maxExpensesPerMonth: null,
    voiceCapture: true,
    receiptImage: true,
    analytics: true,
  },
  pro: {
    maxExpensesPerMonth: null,
    voiceCapture: true,
    receiptImage: true,
    analytics: true,
  },
};

/** Resolve entitlements for a plan. */
export function entitlementsFor(plan: Plan): Entitlements {
  return PLAN_ENTITLEMENTS[plan];
}

/** GET /me (and GET /subscription embeds the subscription + entitlements). */
export const meResponseSchema = z.object({
  user: userProfileSchema,
  subscription: subscriptionSchema,
  entitlements: entitlementsSchema,
});
export type MeResponse = z.infer<typeof meResponseSchema>;

/** GET /subscription response body. */
export const subscriptionResponseSchema = z.object({
  subscription: subscriptionSchema,
  entitlements: entitlementsSchema,
});
export type SubscriptionResponse = z.infer<typeof subscriptionResponseSchema>;

/** PATCH /me request body — only the user-editable profile fields. */
export const updateProfileRequestSchema = z
  .object({
    displayName: z.string().trim().min(1).max(120).optional(),
    timezone: z.string().trim().min(1).max(64).optional(),
  })
  .refine((v) => v.displayName !== undefined || v.timezone !== undefined, {
    message: "no fields to update",
  });
export type UpdateProfileRequest = z.infer<typeof updateProfileRequestSchema>;

/** POST /subscription request body (admin-only plan change). */
export const changePlanRequestSchema = z.object({
  plan: planSchema,
});
export type ChangePlanRequest = z.infer<typeof changePlanRequestSchema>;

// ---------------------------------------------------------------------------
// Server-side expense reads: owner-scoped list + analytics. These are additive
// read endpoints for a richer UI; mobile SQLite remains the UI source of truth
// and all mutations still flow through /sync.
// ---------------------------------------------------------------------------

/** Query params for GET /expenses (all optional; coerced from the querystring). */
export const expenseQuerySchema = z
  .object({
    // "YYYY-MM" shortcut; when set it supersedes from/to.
    month: z
      .string()
      .regex(/^\d{4}-\d{2}$/)
      .optional(),
    from: z.string().datetime({ offset: true }).optional(),
    to: z.string().datetime({ offset: true }).optional(),
    category: z.string().trim().min(1).optional(),
    paymentMethod: z.string().trim().min(1).optional(),
    search: z.string().trim().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(200).default(50),
    // Opaque cursor: the `spent_at` ISO of the last item from the prior page.
    cursor: z.string().datetime({ offset: true }).optional(),
  })
  .default({});
export type ExpenseQuery = z.infer<typeof expenseQuerySchema>;

/** GET /expenses response body (keyset pagination by spent_at desc). */
export const expenseListResponseSchema = z.object({
  items: z.array(expenseSchema),
  nextCursor: z.string().datetime({ offset: true }).nullable().default(null),
});
export type ExpenseListResponse = z.infer<typeof expenseListResponseSchema>;

/** One category/payment-method aggregate bucket. */
export const summaryBucketSchema = z.object({
  key: z.string(),
  total: z.number(),
  count: z.number().int(),
});
export type SummaryBucket = z.infer<typeof summaryBucketSchema>;

/** One day of spend in the summary series. */
export const summaryDaySchema = z.object({
  day: z.string(), // YYYY-MM-DD (in the user's timezone)
  total: z.number(),
  count: z.number().int(),
});
export type SummaryDay = z.infer<typeof summaryDaySchema>;

/** GET /expenses/summary response body. */
export const expenseSummaryResponseSchema = z.object({
  total: z.number(),
  count: z.number().int(),
  currency: z.string(),
  byCategory: z.array(summaryBucketSchema),
  byPaymentMethod: z.array(summaryBucketSchema),
  daily: z.array(summaryDaySchema),
});
export type ExpenseSummaryResponse = z.infer<typeof expenseSummaryResponseSchema>;
