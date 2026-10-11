import type { VercelRequest, VercelResponse } from "@vercel/node";
import { v7 as uuidv7 } from "uuid";
import {
  parseRequestSchema,
  type Expense,
  type ParsedGroup,
  type ParseResponse,
} from "@expense/shared";
import { requireAuth } from "../lib/auth.js";
import { parseExpenses } from "../lib/llm.js";
import { uploadReceipt } from "../lib/r2.js";

const TZ = "Asia/Dhaka";

/**
 * POST /api/parse — turn raw captures into structured, editable draft rows.
 *
 * For each capture: image captures are uploaded to R2 (proxy) and sent to the
 * multimodal LLM; text/voice captures are sent as text. The model returns an
 * array of line items sharing one server-assigned group_id. Nothing is written
 * to the DB here — the user confirms the draft first.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!(await requireAuth(req, res))) return;
  if (req.method !== "POST") {
    res.status(405).json({ error: "method not allowed" });
    return;
  }

  const parsed = parseRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "bad request", issues: parsed.error.issues });
    return;
  }

  const nowIso = new Date().toISOString();

  try {
    // Captures are independent; process them concurrently. Within a capture the
    // R2 upload and the LLM call are also independent (parseExpenses takes the
    // base64 directly and never reads receiptKey), so run them in parallel too.
    // Promise.all preserves order, so groups still mirror the request order.
    const groups: ParsedGroup[] = await Promise.all(
      parsed.data.captures.map(async (capture): Promise<ParsedGroup> => {
        const groupId = uuidv7();

        const [receiptKey, items] = await Promise.all([
          capture.source === "image" && capture.imageBase64
            ? uploadReceipt(groupId, capture.imageBase64)
            : Promise.resolve<string | null>(null),
          parseExpenses({
            text: capture.text,
            imageBase64: capture.imageBase64,
            nowIso,
            tz: TZ,
          }),
        ]);

        const expenses: Expense[] = items.map((it) => ({
          id: uuidv7(),
          groupId,
          amount: it.amount,
          currency: it.currency,
          category: it.category,
          merchant: it.merchant,
          description: it.description,
          paymentMethod: it.paymentMethod,
          source: capture.source,
          rawInput: capture.text ?? "",
          receiptKey,
          spentAt: it.spentAt,
          createdAt: nowIso,
          updatedAt: nowIso,
          deletedAt: null,
        }));

        return { clientId: capture.clientId, groupId, receiptKey, expenses };
      }),
    );

    const body: ParseResponse = { groups };
    res.status(200).json(body);
  } catch (err) {
    res.status(502).json({ error: "parse failed", detail: String(err) });
  }
}
