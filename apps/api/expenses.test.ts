import { describe, it, expect, beforeEach, vi } from "vitest";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const h = vi.hoisted(() => {
  const queue: unknown[] = [];
  const chain: unknown = new Proxy(function () {}, {
    get(_t, prop) {
      if (prop === "then") {
        return (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
          Promise.resolve(queue.shift()).then(resolve, reject);
      }
      return () => chain;
    },
    apply() {
      return chain;
    },
  });
  return {
    queue,
    db: { select: () => chain },
    requireAuth: vi.fn(),
    ensureUser: vi.fn(),
  };
});

vi.mock("./lib/auth.js", () => ({ requireAuth: h.requireAuth, isAdmin: () => false }));
vi.mock("./lib/db.js", () => ({ getDb: () => h.db }));
vi.mock("./lib/users.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./lib/users.js")>()),
  ensureUser: h.ensureUser,
}));

const listHandler = (await import("./api/expenses/index.js")).default;
const summaryHandler = (await import("./api/expenses/summary.js")).default;

const d = (iso: string) => new Date(iso);
const dbExpense = (id: string, spentAt: string) => ({
  id,
  ownerId: "u",
  groupId: "018f0000-0000-7000-8000-000000000099",
  amount: "100.00",
  currency: "BDT",
  category: "food",
  merchant: "Cafe",
  description: "",
  paymentMethod: "cash",
  source: "text",
  rawInput: "lunch",
  receiptKey: null,
  spentAt: d(spentAt),
  createdAt: d(spentAt),
  updatedAt: d(spentAt),
  deletedAt: null,
});

function mockRes() {
  const out = { code: 0, body: undefined as unknown };
  const res = {
    setHeader: () => {},
    status(code: number) {
      out.code = code;
      return { json: (body: unknown) => (out.body = body) };
    },
  } as unknown as VercelResponse;
  return { res, out };
}

beforeEach(() => {
  h.queue.length = 0;
  h.requireAuth.mockReset();
  h.ensureUser.mockReset();
  h.requireAuth.mockResolvedValue({ ownerId: "u", claims: { sub: "u" } });
  h.ensureUser.mockResolvedValue({ user: { timezone: "Asia/Dhaka" } });
});

describe("GET /api/expenses", () => {
  it("paginates: returns `limit` items and a nextCursor when more exist", async () => {
    // limit=2 → handler fetches 3; third row signals there is a next page.
    h.queue.push([
      dbExpense("018f0000-0000-7000-8000-000000000001", "2026-10-10T10:00:00Z"),
      dbExpense("018f0000-0000-7000-8000-000000000002", "2026-10-09T10:00:00Z"),
      dbExpense("018f0000-0000-7000-8000-000000000003", "2026-10-08T10:00:00Z"),
    ]);
    const { res, out } = mockRes();
    await handlerGet(listHandler, { limit: "2" }, res);
    const body = out.body as { items: unknown[]; nextCursor: string | null };
    expect(out.code).toBe(200);
    expect(body.items).toHaveLength(2);
    expect(body.nextCursor).toBe("2026-10-09T10:00:00.000Z");
  });

  it("returns nextCursor=null on the last page", async () => {
    h.queue.push([
      dbExpense("018f0000-0000-7000-8000-000000000001", "2026-10-10T10:00:00Z"),
    ]);
    const { res, out } = mockRes();
    await handlerGet(listHandler, { limit: "2" }, res);
    const body = out.body as { items: unknown[]; nextCursor: string | null };
    expect(body.items).toHaveLength(1);
    expect(body.nextCursor).toBeNull();
  });

  it("400s a bad limit", async () => {
    const { res, out } = mockRes();
    await handlerGet(listHandler, { limit: "999" }, res);
    expect(out.code).toBe(400);
  });
});

describe("GET /api/expenses/summary", () => {
  it("maps totals and breakdowns from the aggregate queries", async () => {
    // totals → byCategory → byPaymentMethod → daily
    h.queue.push(
      [{ total: "300", count: 3, currency: "BDT" }],
      [
        { key: "food", total: "200", count: 2 },
        { key: "transport", total: "100", count: 1 },
      ],
      [{ key: "cash", total: "300", count: 3 }],
      [{ day: "2026-10-10", total: "300", count: 3 }],
    );
    const { res, out } = mockRes();
    await handlerGet(summaryHandler, {}, res);
    const body = out.body as {
      total: number;
      count: number;
      currency: string;
      byCategory: { key: string; total: number }[];
      daily: { day: string; total: number }[];
    };
    expect(out.code).toBe(200);
    expect(body.total).toBe(300);
    expect(body.count).toBe(3);
    expect(body.currency).toBe("BDT");
    expect(body.byCategory[0]).toEqual({ key: "food", total: 200, count: 2 });
    expect(body.daily[0]!.day).toBe("2026-10-10");
  });
});

type Handler = (req: VercelRequest, res: VercelResponse) => Promise<void>;
function handlerGet(
  handler: Handler,
  query: Record<string, string>,
  res: VercelResponse,
) {
  return handler({ method: "GET", query } as unknown as VercelRequest, res);
}
