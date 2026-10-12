import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { ZodError } from "zod";

/**
 * Tiny response helpers so every handler returns the same JSON error shape
 * (`{ error, detail?, issues? }`) and the same status codes, instead of each
 * endpoint hand-rolling `res.status(...).json(...)`.
 */

export function sendJson(res: VercelResponse, status: number, body: unknown): void {
  res.status(status).json(body);
}

export function badRequest(res: VercelResponse, error: ZodError): void {
  res.status(400).json({ error: "bad request", issues: error.issues });
}

export function methodNotAllowed(res: VercelResponse, allow: string[]): void {
  res.setHeader("Allow", allow.join(", "));
  res.status(405).json({ error: "method not allowed" });
}

export function forbidden(res: VercelResponse, detail?: string): void {
  res.status(403).json({ error: "forbidden", ...(detail ? { detail } : {}) });
}

export function serverError(res: VercelResponse, label: string, err: unknown): void {
  res.status(500).json({ error: label, detail: String(err) });
}

/** True when the request method is one of `allowed`; otherwise 405s. */
export function requireMethod(
  req: VercelRequest,
  res: VercelResponse,
  allowed: string[],
): boolean {
  if (req.method && allowed.includes(req.method)) return true;
  methodNotAllowed(res, allowed);
  return false;
}
