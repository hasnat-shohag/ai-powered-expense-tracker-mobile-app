import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { db as schema } from "@expense/shared";
import { env } from "./env.js";

/**
 * Drizzle client over Neon's HTTP driver — one round trip per query, ideal for
 * short-lived serverless invocations. Lazily constructed so importing this
 * module never forces env validation at build time.
 */
let cached: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (cached) return cached;
  const sql = neon(env().DATABASE_URL);
  cached = drizzle(sql, { schema });
  return cached;
}

export { schema };
