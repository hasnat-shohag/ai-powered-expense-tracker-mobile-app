import * as FileSystem from "expo-file-system";
import type { Expense, ParseRequest } from "@expense/shared";
import { parseCaptures } from "../api/client";
import { deleteCaptureFile } from "../capture";
import {
  createExpenses,
  listPendingCaptures,
  removePendingCaptures,
  type PendingCapture,
} from "../db";

/**
 * The combined, editable draft produced by draining pending captures through
 * /parse. `items` is the flat list the user reviews; `captureIds` and
 * `imagePaths` are what to clean up once the draft is saved.
 */
export interface Draft {
  items: Expense[];
  captureIds: string[];
  imagePaths: (string | null)[];
}

async function toRequestCapture(c: PendingCapture) {
  if (c.source === "image" && c.imagePath) {
    const imageBase64 = await FileSystem.readAsStringAsync(c.imagePath, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return { clientId: c.id, source: c.source, text: "", imageBase64 };
  }
  return { clientId: c.id, source: c.source, text: c.rawText };
}

/**
 * Send every pending capture to /parse and return a single combined draft
 * across all of them. Requires network; throws ApiError/AuthError on failure
 * (the captures stay queued so a retry is safe). Returns an empty draft when
 * nothing is pending.
 */
export async function drainAndParse(): Promise<Draft> {
  const pending = await listPendingCaptures();
  if (pending.length === 0) {
    return { items: [], captureIds: [], imagePaths: [] };
  }

  const captures = await Promise.all(pending.map(toRequestCapture));
  const req: ParseRequest = { captures };
  const { groups } = await parseCaptures(req);

  const items: Expense[] = [];
  for (const g of groups) items.push(...g.expenses);

  return {
    items,
    captureIds: pending.map((p) => p.id),
    imagePaths: pending.map((p) => p.imagePath),
  };
}

/**
 * Commit a reviewed draft: write the (possibly edited) rows to the local
 * mirror + outbox, then clear the drained captures and their image files.
 * Rows are saved first so a mid-way failure never loses a confirmed expense;
 * the captures remain queued until their rows are durably stored.
 */
export async function saveDraft(
  edited: Expense[],
  drained: { captureIds: string[]; imagePaths: (string | null)[] },
): Promise<void> {
  await createExpenses(edited);
  await removePendingCaptures(drained.captureIds);
  await Promise.all(drained.imagePaths.map((p) => deleteCaptureFile(p)));
}
