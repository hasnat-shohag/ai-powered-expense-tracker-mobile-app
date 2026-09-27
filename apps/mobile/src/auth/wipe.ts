import { getDb, getMeta, setMeta } from "../db";

/**
 * On-device tenant isolation. The local SQLite mirror has no owner column — it
 * always belongs to exactly one signed-in user — so switching accounts (or
 * signing out) must wipe it before the next user's first sync, or one user
 * would see another's rows. This is the ONLY local tenant boundary; the server
 * enforces ownership by JWT, but the device relies on this wipe.
 */

/** app_meta key holding the Clerk user id the local data currently belongs to. */
export const ACTIVE_USER_KEY = "auth.active_user_id";

/** Delete every local row (expenses, outbox, pending captures, and meta). */
export async function wipeLocalData(): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.execAsync(
      "DELETE FROM expenses; DELETE FROM outbox; DELETE FROM pending_captures; DELETE FROM app_meta;",
    );
  });
}

/**
 * Reconcile the signed-in user against the data on the device. First sign-in
 * (no stored id) keeps existing rows — that is the original single user, whose
 * rows are backfilled to their id server-side. A different id wipes first.
 * Returns true if a wipe happened (caller should refresh the ledger).
 */
export async function reconcileActiveUser(userId: string): Promise<boolean> {
  const stored = await getMeta(ACTIVE_USER_KEY);
  if (stored === userId) return false;
  const switched = stored !== null && stored !== userId;
  if (switched) await wipeLocalData();
  await setMeta(ACTIVE_USER_KEY, userId);
  return switched;
}
