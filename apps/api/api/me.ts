import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq } from "drizzle-orm";
import {
  updateProfileRequestSchema,
  entitlementsFor,
  type MeResponse,
} from "@expense/shared";
import { db as dbSchema } from "@expense/shared";
import { requireAuth } from "../lib/auth.js";
import { getDb } from "../lib/db.js";
import {
  badRequest,
  methodNotAllowed,
  sendJson,
  serverError,
} from "../lib/http.js";
import { ensureUser, toSubscription, toUserProfile } from "../lib/users.js";

const { users } = dbSchema;

/**
 * GET  /api/me  — provision (lazily) and return the caller's profile,
 *                 subscription, and resolved entitlements.
 * PATCH /api/me — update the user-editable profile fields (displayName, timezone).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAuth(req, res);
  if (!auth) return;

  try {
    if (req.method === "GET") {
      const bundle = await ensureUser(auth.ownerId, auth.claims);
      const body: MeResponse = {
        user: toUserProfile(bundle.user),
        subscription: toSubscription(bundle.subscription),
        entitlements: entitlementsFor(bundle.subscription.plan),
      };
      return sendJson(res, 200, body);
    }

    if (req.method === "PATCH") {
      const parsed = updateProfileRequestSchema.safeParse(req.body);
      if (!parsed.success) return badRequest(res, parsed.error);

      // Make sure the row exists before updating it (first-request edge case).
      const bundle = await ensureUser(auth.ownerId, auth.claims);

      const updated = await getDb()
        .update(users)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(eq(users.id, auth.ownerId))
        .returning();

      const body: MeResponse = {
        user: toUserProfile(updated[0] ?? bundle.user),
        subscription: toSubscription(bundle.subscription),
        entitlements: entitlementsFor(bundle.subscription.plan),
      };
      return sendJson(res, 200, body);
    }

    return methodNotAllowed(res, ["GET", "PATCH"]);
  } catch (err) {
    return serverError(res, "me failed", err);
  }
}
