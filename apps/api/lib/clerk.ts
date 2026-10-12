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
  /** Optional profile claims, present only if the JWT template includes them. */
  email?: string;
  name?: string;
  image?: string;
}

/** Verify a bearer token; resolves to the claims or throws on any failure. */
export async function verifySessionToken(token: string): Promise<SessionClaims> {
  const payload = await verifyToken(token, {
    secretKey: env().CLERK_SECRET_KEY,
    jwtKey: env().CLERK_JWT_KEY,
  });
  if (!payload.sub) throw new Error("token has no subject");

  // Clerk's default session token carries only `sub`; a JWT template can add
  // email/name/picture. Read them opportunistically — ensureUser falls back to
  // the Clerk Backend API when they're absent.
  const extra = payload as Record<string, unknown>;
  const str = (v: unknown): string | undefined =>
    typeof v === "string" && v.length > 0 ? v : undefined;

  return {
    sub: payload.sub,
    email: str(extra.email),
    name: str(extra.name),
    image: str(extra.image) ?? str(extra.picture),
  };
}
