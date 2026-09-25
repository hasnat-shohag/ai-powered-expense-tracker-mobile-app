import * as Network from "expo-network";
import type { SyncRequest } from "@expense/shared";
import { syncWithServer, ApiError } from "../api/client";
import {
  applyServerRows,
  getMeta,
  listOutbox,
  removeOutbox,
  setMeta,
  SYNC_CURSOR_KEY,
} from "../db";
import { isApiConfigured } from "../config";
import { hasToken } from "../auth/token";

/** Outcome of a sync pass. */
export interface SyncResult {
  pushed: number;
  pulled: number;
  skipped?: "offline" | "unconfigured" | "busy";
}

let syncing = false;

/** True when the device reports an internet-reachable connection. */
export async function isOnline(): Promise<boolean> {
  try {
    const state = await Network.getNetworkStateAsync();
    return Boolean(state.isConnected && state.isInternetReachable !== false);
  } catch {
    return false;
  }
}

/**
 * Push the outbox and pull changes since the last cursor, in one request.
 * Last-write-wins is applied on pull; pushed ops are removed only after the
 * server accepts them, and the cursor advances only on success — so a failed
 * sync is safe to retry and never drops a queued mutation. Non-throwing:
 * connectivity/config problems return a `skipped` result.
 */
export async function syncNow(): Promise<SyncResult> {
  if (syncing) return { pushed: 0, pulled: 0, skipped: "busy" };
  if (!isApiConfigured() || !(await hasToken())) {
    return { pushed: 0, pulled: 0, skipped: "unconfigured" };
  }
  if (!(await isOnline())) return { pushed: 0, pulled: 0, skipped: "offline" };

  syncing = true;
  try {
    const outbox = await listOutbox();
    const since = await getMeta(SYNC_CURSOR_KEY);
    const req: SyncRequest = { since, ops: outbox.map((e) => e.push) };

    const res = await syncWithServer(req);

    await applyServerRows(res.changed);
    await removeOutbox(outbox.map((e) => e.rowId));
    await setMeta(SYNC_CURSOR_KEY, res.cursor);

    return { pushed: outbox.length, pulled: res.changed.length };
  } catch (err) {
    if (err instanceof ApiError && err.status === 0) {
      return { pushed: 0, pulled: 0, skipped: "offline" };
    }
    throw err;
  } finally {
    syncing = false;
  }
}

let debounceHandle: ReturnType<typeof setTimeout> | null = null;

/**
 * Request a sync after a short quiet period. Called after a local mutation so
 * a burst of edits collapses into one push. Errors are swallowed — a debounced
 * background sync must never surface as an unhandled rejection; the next
 * trigger (or a manual pull-to-refresh) retries.
 */
export function requestSync(delayMs = 1500): void {
  if (debounceHandle) clearTimeout(debounceHandle);
  debounceHandle = setTimeout(() => {
    debounceHandle = null;
    void syncNow().catch(() => undefined);
  }, delayMs);
}

/**
 * Attach the ambient sync triggers: a network-regain listener that syncs when
 * connectivity returns. Foreground (AppState) and pull-to-refresh triggers are
 * wired at the screen/app level. Returns an unsubscribe function.
 */
export function startNetworkSyncTrigger(): () => void {
  const sub = Network.addNetworkStateListener((state) => {
    if (state.isConnected && state.isInternetReachable !== false) {
      requestSync(0);
    }
  });
  return () => sub.remove();
}
