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
  if (!requireAuth(req, res)) return;
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
  const groups: ParsedGroup[] = [];

  try {
    for (const capture of parsed.data.captures) {
      const groupId = uuidv7();

      let receiptKey: string | null = null;
      if (capture.source === "image" && capture.imageBase64) {
        receiptKey = await uploadReceipt(groupId, capture.imageBase64);
      }

      const items = await parseExpenses({
        text: capture.text,
        imageBase64: capture.imageBase64,
        nowIso,
        tz: TZ,
      });

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

      groups.push({ clientId: capture.clientId, groupId, receiptKey, expenses });
    }

    const body: ParseResponse = { groups };
    res.status(200).json(body);
  } catch (err) {
    res.status(502).json({ error: "parse failed", detail: String(err) });
  }
}
