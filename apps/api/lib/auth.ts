import type { VercelRequest, VercelResponse } from "@vercel/node";
import { env } from "./env.js";
import { verifySessionToken } from "./clerk.js";

/**
 * Per-user authentication via Clerk. Every request carries a Clerk session JWT
 * as `Authorization: Bearer <token>`; we verify it and resolve the caller's
 * Clerk user id, which becomes the owner/tenant for all data access.
 *
 * A backend allowlist (`ALLOWED_CLERK_USER_IDS`) backs up the Clerk dashboard
 * restriction: while it is set, only listed users are admitted, so the private
 * foundation phase cannot leak API cost to strangers even if the dashboard
 * config drifts. Empty/unset = any signed-in user (for when sign-up opens).
 */
export interface AuthContext {
  /** The verified Clerk user id — the owner_id for row scoping. */
  ownerId: string;
}

/**
 * Resolve the authenticated caller, or write a 401 and return null. Callers do
 * `const auth = await requireAuth(req, res); if (!auth) return;`.
 */
export async function requireAuth(
  req: VercelRequest,
  res: VercelResponse,
): Promise<AuthContext | null> {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) {
    res.status(401).json({ error: "unauthorized" });
    return null;
  }

  let sub: string;
  try {
    ({ sub } = await verifySessionToken(token));
  } catch {
    res.status(401).json({ error: "unauthorized" });
    return null;
  }

  if (!isAllowed(sub)) {
    res.status(403).json({ error: "forbidden" });
    return null;
  }

  return { ownerId: sub };
}

/** True when the user id is permitted. Empty allowlist admits everyone. */
function isAllowed(sub: string): boolean {
  const allow = (env().ALLOWED_CLERK_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return allow.length === 0 || allow.includes(sub);
}
