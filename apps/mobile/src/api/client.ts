import {
  parseRequestSchema,
  parseResponseSchema,
  syncRequestSchema,
  syncResponseSchema,
  meResponseSchema,
  subscriptionResponseSchema,
  updateProfileRequestSchema,
  type ParseRequest,
  type ParseResponse,
  type SyncRequest,
  type SyncResponse,
  type MeResponse,
  type SubscriptionResponse,
  type UpdateProfileRequest,
} from "@expense/shared";
import { API_BASE_URL, isApiConfigured } from "../config";
import { getSessionToken } from "../auth/session";

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
  const token = await getSessionToken();
  if (!token) throw new AuthError("Not signed in.");

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

/**
 * GET /api/health — verify the backend URL + bearer token before relying on
 * them. Returns on 200, throws AuthError on 401 and ApiError otherwise (status
 * 0 = offline/unreachable). Used by the Settings screen's "Test connection".
 */
export async function checkHealth(): Promise<{ ok: boolean; db: string }> {
  if (!isApiConfigured()) {
    throw new ApiError("Backend URL is not configured.", 0);
  }
  const token = await getSessionToken();
  if (!token) throw new AuthError("Not signed in.");

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/api/health`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new ApiError("Network request failed — you may be offline.", 0);
  }

  if (res.status === 401) throw new AuthError();
  if (!res.ok) {
    throw new ApiError(`Backend is unhealthy (${res.status}).`, res.status);
  }
  return (await res.json()) as { ok: boolean; db: string };
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

/**
 * Shared JSON request for the account endpoints (GET/PATCH). Same auth/offline
 * handling as `post`: throws AuthError on 401, ApiError otherwise (status 0 =
 * offline/unconfigured).
 */
async function jsonRequest<T>(
  method: "GET" | "PATCH",
  path: string,
  body?: unknown,
): Promise<T> {
  if (!isApiConfigured()) {
    throw new ApiError("Backend URL is not configured.", 0);
  }
  const token = await getSessionToken();
  if (!token) throw new AuthError("Not signed in.");

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
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

/** GET /api/me — the signed-in user's profile, subscription, and entitlements. */
export async function getMe(): Promise<MeResponse> {
  return meResponseSchema.parse(await jsonRequest<unknown>("GET", "/api/me"));
}

/** PATCH /api/me — update the editable profile fields (displayName, timezone). */
export async function patchMe(body: UpdateProfileRequest): Promise<MeResponse> {
  const payload = updateProfileRequestSchema.parse(body);
  return meResponseSchema.parse(
    await jsonRequest<unknown>("PATCH", "/api/me", payload),
  );
}

/** GET /api/subscription — current subscription + entitlements. */
export async function getSubscription(): Promise<SubscriptionResponse> {
  return subscriptionResponseSchema.parse(
    await jsonRequest<unknown>("GET", "/api/subscription"),
  );
}
