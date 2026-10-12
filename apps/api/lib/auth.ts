import type { VercelRequest, VercelResponse } from "@vercel/node";
import { env } from "./env.js";
import { verifySessionToken, type SessionClaims } from "./clerk.js";

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
  /** Verified token claims (profile fields present only via a JWT template). */
  claims: SessionClaims;
}

/**
 * Resolve the authenticated caller, or write a 401/403 and return null. Callers
 * do `const auth = await requireAuth(req, res); if (!auth) return;`.
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

  let claims: SessionClaims;
  try {
    claims = await verifySessionToken(token);
  } catch (e) {
    // Surface the verification failure reason in the function log — the client
    // only ever sees a generic 401, so this is the one place to diagnose a
    // token/instance/JWT-key mismatch from the deployed runtime.
    console.error("[auth] token verification failed:", (e as Error)?.message);
    res.status(401).json({ error: "unauthorized" });
    return null;
  }

  if (!isAllowed(claims.sub)) {
    res.status(403).json({ error: "forbidden" });
    return null;
  }

  return { ownerId: claims.sub, claims };
}

/** True when the user id is permitted. Empty allowlist admits everyone. */
function isAllowed(sub: string): boolean {
  return matchesCsv(sub, env().ALLOWED_CLERK_USER_IDS, true);
}

/** True when the caller is a configured admin. Empty admin list admits nobody. */
export function isAdmin(sub: string): boolean {
  return matchesCsv(sub, env().ADMIN_CLERK_USER_IDS, false);
}

/**
 * Membership test for a comma-separated id list. `emptyAdmitsAll` decides what
 * an empty/unset list means: allowlist = everyone, admin list = nobody.
 */
function matchesCsv(
  sub: string,
  csv: string | undefined,
  emptyAdmitsAll: boolean,
): boolean {
  const ids = (csv ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return ids.length === 0 ? emptyAdmitsAll : ids.includes(sub);
}
