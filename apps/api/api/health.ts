import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import { getDb } from "../lib/db.js";

/** GET /api/health — auth + DB reachability probe. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireAuth(req, res)) return;
  try {
    await getDb().execute(sql`select 1`);
    res.status(200).json({ ok: true, db: "up", time: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ ok: false, db: "down", error: String(err) });
  }
}
