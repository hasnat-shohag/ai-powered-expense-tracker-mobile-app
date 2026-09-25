import type { Expense } from "@expense/shared";
import {
  softDeleteExpense as dbSoftDelete,
  updateExpense as dbUpdate,
  type ExpensePatch,
} from "../db";
import { requestSync } from "../sync/engine";

/**
 * Offline-first mutations for confirmed expenses. Each writes to local SQLite
 * (immediate, source of truth for the UI) and schedules a debounced sync so
 * the change reaches Neon when the network allows. The UI reads the returned
 * value straight away without waiting for the network.
 */
export async function editExpense(
  id: string,
  patch: ExpensePatch,
): Promise<Expense | null> {
  const updated = await dbUpdate(id, patch);
  requestSync();
  return updated;
}

export async function deleteExpense(id: string): Promise<void> {
  await dbSoftDelete(id);
  requestSync();
}
