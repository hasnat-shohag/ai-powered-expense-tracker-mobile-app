import { describe, it, expect, beforeAll, vi, afterEach } from "vitest";

beforeAll(() => {
  process.env.DATABASE_URL = "postgres://u:p@host/db";
  process.env.OPENAI_BASE_URL = "https://llm.example.com/v1";
  process.env.OPENAI_API_KEY = "k";
  process.env.OPENAI_MODEL = "vision-model";
  process.env.API_BEARER_TOKEN = "t";
  process.env.R2_ACCOUNT_ID = "acct";
  process.env.R2_BUCKET = "bucket";
  process.env.R2_ACCESS_KEY_ID = "ak";
  process.env.R2_SECRET_ACCESS_KEY = "sk";
});

afterEach(() => vi.restoreAllMocks());

function mockChat(content: string) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content } }] }),
    text: async () => content,
  } as unknown as Response;
}

describe("parseExpenses", () => {
  it("parses a valid JSON array on first try", async () => {
    const { parseExpenses } = await import("./lib/llm.js");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        mockChat(
          JSON.stringify([
            { amount: 250, currency: "BDT", category: "food", merchant: "Cafe", description: "", paymentMethod: "cash", spentAt: "2026-09-25T08:00:00Z" },
          ]),
        ),
      ),
    );
    const out = await parseExpenses({ text: "lunch 250", nowIso: "2026-09-25T09:00:00Z", tz: "Asia/Dhaka" });
    expect(out).toHaveLength(1);
    expect(out[0]!.amount).toBe(250);
  });

  it("strips code fences", async () => {
    const { parseExpenses } = await import("./lib/llm.js");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => mockChat('```json\n[{"amount":10,"category":"tea","spentAt":"2026-09-25T08:00:00Z"}]\n```')),
    );
    const out = await parseExpenses({ text: "tea 10", nowIso: "2026-09-25T09:00:00Z", tz: "Asia/Dhaka" });
    expect(out[0]!.category).toBe("tea");
  });

  it("retries once on invalid output then succeeds", async () => {
    const { parseExpenses } = await import("./lib/llm.js");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockChat("not json at all"))
      .mockResolvedValueOnce(mockChat('[{"amount":5,"category":"snack","spentAt":"2026-09-25T08:00:00Z"}]'));
    vi.stubGlobal("fetch", fetchMock);
    const out = await parseExpenses({ text: "snack 5", nowIso: "2026-09-25T09:00:00Z", tz: "Asia/Dhaka" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(out[0]!.amount).toBe(5);
  });

  it("throws after retry still invalid", async () => {
    const { parseExpenses } = await import("./lib/llm.js");
    vi.stubGlobal("fetch", vi.fn(async () => mockChat("garbage")));
    await expect(
      parseExpenses({ text: "x", nowIso: "2026-09-25T09:00:00Z", tz: "Asia/Dhaka" }),
    ).rejects.toThrow(/LLM parse failed/);
  });
});
