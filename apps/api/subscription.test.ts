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
    db: { select: () => chain, insert: () => chain, update: () => chain },
    requireAuth: vi.fn(),
    isAdmin: vi.fn(),
    ensureUser: vi.fn(),
  };
});

vi.mock("./lib/auth.js", () => ({
  requireAuth: h.requireAuth,
  isAdmin: h.isAdmin,
}));
vi.mock("./lib/db.js", () => ({ getDb: () => h.db }));
vi.mock("./lib/users.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./lib/users.js")>()),
  ensureUser: h.ensureUser,
}));

const handler = (await import("./api/subscription.js")).default;

const now = new Date("2026-10-12T00:00:00Z");
const subRow = (plan: string) => ({
  id: "sub_1",
  userId: "u",
  plan,
  status: "active",
  currentPeriodStart: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  createdAt: now,
  updatedAt: now,
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
  h.isAdmin.mockReset();
  h.ensureUser.mockReset();
  h.requireAuth.mockResolvedValue({ ownerId: "u", claims: { sub: "u" } });
  h.ensureUser.mockResolvedValue({ user: {}, subscription: subRow("free") });
});

describe("POST /api/subscription", () => {
  it("403s a non-admin trying to change the plan", async () => {
    h.isAdmin.mockReturnValue(false);
    const { res, out } = mockRes();
    await handler(
      { method: "POST", body: { plan: "pro" } } as unknown as VercelRequest,
      res,
    );
    expect(out.code).toBe(403);
  });

  it("lets an admin change the plan", async () => {
    h.isAdmin.mockReturnValue(true);
    h.queue.push([subRow("pro")]); // update ... returning
    const { res, out } = mockRes();
    await handler(
      { method: "POST", body: { plan: "pro" } } as unknown as VercelRequest,
      res,
    );
    expect(out.code).toBe(200);
    expect((out.body as { subscription: { plan: string } }).subscription.plan).toBe(
      "pro",
    );
  });

  it("400s an invalid plan", async () => {
    h.isAdmin.mockReturnValue(true);
    const { res, out } = mockRes();
    await handler(
      { method: "POST", body: { plan: "enterprise" } } as unknown as VercelRequest,
      res,
    );
    expect(out.code).toBe(400);
  });
});

describe("GET /api/subscription", () => {
  it("returns the current subscription + entitlements", async () => {
    const { res, out } = mockRes();
    await handler({ method: "GET" } as unknown as VercelRequest, res);
    expect(out.code).toBe(200);
    const body = out.body as {
      subscription: { plan: string };
      entitlements: { analytics: boolean };
    };
    expect(body.subscription.plan).toBe("free");
    expect(body.entitlements.analytics).toBe(true);
  });
});
