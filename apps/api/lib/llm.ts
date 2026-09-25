import { z } from "zod";
import { parseResultSchema, type ParseResult } from "@expense/shared";
import { env } from "./env.js";

/** A single OpenAI-compatible chat message (text or multimodal content). */
type ChatContent =
  | string
  | Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    >;

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: ChatContent;
}

const chatResponseSchema = z.object({
  choices: z
    .array(z.object({ message: z.object({ content: z.string() }) }))
    .min(1),
});

/**
 * System prompt with current time + timezone injected so relative dates
 * ("yesterday", "lunch today") resolve to absolute UTC instants. The model must
 * return a JSON array — one object per line item / product.
 */
function systemPrompt(nowIso: string, tz: string): string {
  return [
    "You extract expenses from user input (typed text, transcribed speech, or a receipt photo).",
    `The current time is ${nowIso} and the user's timezone is ${tz}.`,
    "Resolve any relative date/time to an absolute ISO-8601 UTC instant for `spentAt`.",
    "Return ONLY a JSON array. Each distinct product / line item is its own object.",
    "Each object: { amount:number, currency:string, category:string, merchant:string, description:string, paymentMethod:string|null, spentAt:string (ISO-8601 UTC) }.",
    "Default currency to BDT when not stated. Choose a concise, sensible category. Use null for paymentMethod when not mentioned.",
    "No prose, no markdown fences — just the JSON array.",
  ].join("\n");
}

/** Strip ```json fences if the model wrapped its output. */
function stripFences(s: string): string {
  const t = s.trim();
  const m = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return (m?.[1] ?? t).trim();
}

/**
 * Call the LLM and validate its output against the shared Zod schema, retrying
 * once with a corrective message if the first response fails to parse/validate.
 */
export async function parseExpenses(input: {
  text?: string;
  imageBase64?: string;
  nowIso: string;
  tz: string;
}): Promise<ParseResult> {
  const { OPENAI_BASE_URL, OPENAI_API_KEY, OPENAI_MODEL } = env();

  const userContent: ChatContent = input.imageBase64
    ? [
        { type: "text", text: input.text?.trim() || "Extract every line item from this receipt." },
        {
          type: "image_url",
          image_url: { url: `data:image/jpeg;base64,${input.imageBase64}` },
        },
      ]
    : (input.text ?? "").trim();

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt(input.nowIso, input.tz) },
    { role: "user", content: userContent },
  ];

  let lastErr = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await chat(OPENAI_BASE_URL, OPENAI_API_KEY, OPENAI_MODEL, messages);
    const parsed = safeJson(stripFences(raw));
    if (parsed.ok) {
      const validated = parseResultSchema.safeParse(parsed.value);
      if (validated.success) return validated.data;
      lastErr = validated.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    } else {
      lastErr = parsed.error;
    }
    // Feed the failure back for a corrective retry.
    messages.push({ role: "assistant", content: raw });
    messages.push({
      role: "user",
      content: `That was not valid. Error: ${lastErr}. Reply with ONLY the corrected JSON array.`,
    });
  }
  throw new Error(`LLM parse failed after retry: ${lastErr}`);
}

async function chat(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: ChatMessage[],
): Promise<string> {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, temperature: 0 }),
  });
  if (!res.ok) {
    throw new Error(`LLM HTTP ${res.status}: ${await res.text()}`);
  }
  const body = chatResponseSchema.parse(await res.json());
  return body.choices[0]!.message.content;
}

function safeJson(s: string): { ok: true; value: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(s) };
  } catch (e) {
    return { ok: false, error: `invalid JSON: ${String(e)}` };
  }
}
