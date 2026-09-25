import type { VercelRequest, VercelResponse } from "@vercel/node";
import { env } from "./env.js";

/**
 * Constant-time-ish bearer check. The token is a single shared secret stored in
 * Vercel env and in the device SecureStore. Any request missing or mismatching
 * it is rejected before touching the DB or LLM.
 *
 * Returns true if authorized; otherwise writes a 401 and returns false.
 */
export function requireAuth(req: VercelRequest, res: VercelResponse): boolean {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const expected = env().API_BEARER_TOKEN;

  if (token.length !== expected.length || !timingSafeEqual(token, expected)) {
    res.status(401).json({ error: "unauthorized" });
    return false;
  }
  return true;
}

/** Length-independent constant-time string compare. */
function timingSafeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}
