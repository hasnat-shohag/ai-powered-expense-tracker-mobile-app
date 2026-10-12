import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq } from "drizzle-orm";
import {
  changePlanRequestSchema,
  entitlementsFor,
  type SubscriptionResponse,
} from "@expense/shared";
import { db as dbSchema } from "@expense/shared";
import { requireAuth, isAdmin } from "../lib/auth.js";
import { getDb } from "../lib/db.js";
import {
  badRequest,
  forbidden,
  methodNotAllowed,
  sendJson,
  serverError,
} from "../lib/http.js";
import { ensureUser, toSubscription } from "../lib/users.js";

const { subscriptions } = dbSchema;

/**
 * GET  /api/subscription — current subscription + entitlements.
 * POST /api/subscription — change the plan. Model-only billing: admin-granted,
 *   no payment flow. Non-admins get 403.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAuth(req, res);
  if (!auth) return;

  try {
    if (req.method === "GET") {
      const bundle = await ensureUser(auth.ownerId, auth.claims);
      const body: SubscriptionResponse = {
        subscription: toSubscription(bundle.subscription),
        entitlements: entitlementsFor(bundle.subscription.plan),
      };
      return sendJson(res, 200, body);
    }

    if (req.method === "POST") {
      if (!isAdmin(auth.ownerId)) {
        return forbidden(res, "plan changes are admin-only");
      }
      const parsed = changePlanRequestSchema.safeParse(req.body);
      if (!parsed.success) return badRequest(res, parsed.error);

      // Ensure the subscription row exists, then flip the plan.
      await ensureUser(auth.ownerId, auth.claims);
      const updated = await getDb()
        .update(subscriptions)
        .set({ plan: parsed.data.plan, updatedAt: new Date() })
        .where(eq(subscriptions.userId, auth.ownerId))
        .returning();

      const body: SubscriptionResponse = {
        subscription: toSubscription(updated[0]!),
        entitlements: entitlementsFor(updated[0]!.plan),
      };
      return sendJson(res, 200, body);
    }

    return methodNotAllowed(res, ["GET", "POST"]);
  } catch (err) {
    return serverError(res, "subscription failed", err);
  }
}
