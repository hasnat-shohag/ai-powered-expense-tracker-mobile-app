import {
  parseRequestSchema,
  parseResponseSchema,
  syncRequestSchema,
  syncResponseSchema,
  type ParseRequest,
  type ParseResponse,
  type SyncRequest,
  type SyncResponse,
} from "@expense/shared";
import { API_BASE_URL, isApiConfigured } from "../config";
import { getToken } from "../auth/token";

/** A request failed. `status` is the HTTP code (0 = network/offline). */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** The bearer token was missing or rejected (401) — re-entry required. */
export class AuthError extends ApiError {
  constructor(message = "Not authorized — check the API token.") {
    super(message, 401);
    this.name = "AuthError";
  }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  if (!isApiConfigured()) {
    throw new ApiError("Backend URL is not configured.", 0);
  }
  const token = await getToken();
  if (!token) throw new AuthError("No API token set.");

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
  } catch {
    // No connectivity / DNS / TLS failure — surfaced as offline.
    throw new ApiError("Network request failed — you may be offline.", 0);
  }

  if (res.status === 401) throw new AuthError();
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new ApiError(
      `Request to ${path} failed (${res.status}). ${detail}`.trim(),
      res.status,
    );
  }
  return (await res.json()) as T;
}

/** POST /api/parse — send pending captures, get grouped draft expenses back. */
export async function parseCaptures(req: ParseRequest): Promise<ParseResponse> {
  const body = parseRequestSchema.parse(req);
  const json = await post<unknown>("/api/parse", body);
  return parseResponseSchema.parse(json);
}

/** POST /api/sync — push queued ops and pull rows changed since the cursor. */
export async function syncWithServer(req: SyncRequest): Promise<SyncResponse> {
  const body = syncRequestSchema.parse(req);
  const json = await post<unknown>("/api/sync", body);
  return syncResponseSchema.parse(json);
}
