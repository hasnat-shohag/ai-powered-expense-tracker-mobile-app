import { describe, it, expect, vi, beforeEach } from "vitest";
import type { VercelRequest, VercelResponse } from "@vercel/node";

// Mock the Clerk verifier and env so requireAuth is tested in isolation.
const h = vi.hoisted(() => ({
  allow: "",
  verify: vi.fn<(token: string) => Promise<{ sub: string }>>(),
}));

vi.mock("./lib/clerk.js", () => ({ verifySessionToken: h.verify }));
vi.mock("./lib/env.js", () => ({
  env: () => ({ ALLOWED_CLERK_USER_IDS: h.allow }),
}));

const { requireAuth } = await import("./lib/auth.js");

function mockRes() {
  const out = { code: 0, body: undefined as unknown };
  const res = {
    status(code: number) {
      out.code = code;
      return {
        json(body: unknown) {
          out.body = body;
        },
      };
    },
  } as unknown as VercelResponse;
  return { res, out };
}

function reqWith(auth?: string): VercelRequest {
  return { headers: auth ? { authorization: auth } : {} } as VercelRequest;
}

beforeEach(() => {
  h.allow = "";
  h.verify.mockReset();
});

describe("requireAuth", () => {
  it("returns the ownerId from the verified token subject", async () => {
    h.verify.mockResolvedValue({ sub: "user_abc" });
    const { res, out } = mockRes();
    const auth = await requireAuth(reqWith("Bearer good"), res);
    expect(auth).toEqual({ ownerId: "user_abc" });
    expect(out.code).toBe(0);
  });

  it("401s when the Authorization header is missing", async () => {
    const { res, out } = mockRes();
    const auth = await requireAuth(reqWith(), res);
    expect(auth).toBeNull();
    expect(out.code).toBe(401);
    expect(h.verify).not.toHaveBeenCalled();
  });

  it("401s when the token fails verification", async () => {
    h.verify.mockRejectedValue(new Error("bad token"));
    const { res, out } = mockRes();
    const auth = await requireAuth(reqWith("Bearer bad"), res);
    expect(auth).toBeNull();
    expect(out.code).toBe(401);
  });

  it("admits an allowlisted subject", async () => {
    h.allow = "user_abc, user_def";
    h.verify.mockResolvedValue({ sub: "user_def" });
    const { res } = mockRes();
    const auth = await requireAuth(reqWith("Bearer good"), res);
    expect(auth).toEqual({ ownerId: "user_def" });
  });

  it("403s a valid token whose subject is not allowlisted", async () => {
    h.allow = "user_abc";
    h.verify.mockResolvedValue({ sub: "user_zzz" });
    const { res, out } = mockRes();
    const auth = await requireAuth(reqWith("Bearer good"), res);
    expect(auth).toBeNull();
    expect(out.code).toBe(403);
  });
});
