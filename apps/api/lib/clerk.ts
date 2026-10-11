import { verifyToken } from "@clerk/backend";
import { env } from "./env.js";

/**
 * Clerk session-token verification, isolated here so the auth vendor is
 * swappable: only this file and the mobile provider know it is Clerk.
 *
 * `CLERK_JWT_KEY` (a PEM public key) enables networkless verification — no
 * per-request JWKS fetch, which keeps serverless cold starts fast. Without it,
 * `@clerk/backend` falls back to fetching Clerk's JWKS using the secret key.
 */
export interface SessionClaims {
  /** The Clerk user id (`sub`) — our tenant/owner identifier. */
  sub: string;
}

/** Verify a bearer token; resolves to the claims or throws on any failure. */
export async function verifySessionToken(token: string): Promise<SessionClaims> {
  const payload = await verifyToken(token, {
    secretKey: env().CLERK_SECRET_KEY,
    jwtKey: env().CLERK_JWT_KEY,
  });
  if (!payload.sub) throw new Error("token has no subject");
  return { sub: payload.sub };
}
