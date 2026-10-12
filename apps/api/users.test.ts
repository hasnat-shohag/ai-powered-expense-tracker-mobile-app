import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * ensureUser is tested against a scripted DB: a chainable proxy whose awaited
 * result is the next item dequeued from `h.queue`. Each full Drizzle statement
 * is awaited exactly once, so the queue order == statement order in the code.
 */
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
  const db = {
    select: () => chain,
    insert: () => chain,
    update: () => chain,
    delete: () => chain,
  };
  const getUser = vi.fn();
  return { queue, db, getUser };
});

vi.mock("./lib/db.js", () => ({ getDb: () => h.db }));
vi.mock("./lib/env.js", () => ({ env: () => ({ CLERK_SECRET_KEY: "sk_test" }) }));
vi.mock("@clerk/backend", () => ({
  createClerkClient: () => ({ users: { getUser: h.getUser } }),
}));

const { ensureUser } = await import("./lib/users.js");

const now = new Date("2026-10-12T00:00:00Z");

beforeEach(() => {
  h.queue.length = 0;
  h.getUser.mockReset();
});

describe("ensureUser", () => {
  it("provisions a new user from Clerk and a default free subscription", async () => {
    h.getUser.mockResolvedValue({
      emailAddresses: [{ id: "e1", emailAddress: "a@b.com" }],
      primaryEmailAddressId: "e1",
      firstName: "Ada",
      lastName: "Lovelace",
      username: "ada",
      imageUrl: "https://img/ada.png",
    });
    const userRow = {
      id: "user_1",
      email: "a@b.com",
      displayName: "Ada Lovelace",
      imageUrl: "https://img/ada.png",
      timezone: "Asia/Dhaka",
      createdAt: now,
      updatedAt: now,
      lastSeenAt: now,
    };
    const subRow = {
      id: "sub_1",
      userId: "user_1",
      plan: "free",
      status: "active",
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      createdAt: now,
      updatedAt: now,
    };
    // select user (none) → insert user → select sub (none) → insert sub
    h.queue.push([], [userRow], [], [subRow]);

    const bundle = await ensureUser("user_1", { sub: "user_1" });

    expect(h.getUser).toHaveBeenCalledWith("user_1");
    expect(bundle.user.email).toBe("a@b.com");
    expect(bundle.subscription.plan).toBe("free");
    expect(bundle.subscription.status).toBe("active");
  });

  it("bumps an existing user without re-fetching Clerk and keeps the subscription", async () => {
    const existing = {
      id: "user_2",
      email: "c@d.com",
      displayName: "Grace",
      imageUrl: null,
      timezone: "Asia/Dhaka",
      createdAt: now,
      updatedAt: now,
      lastSeenAt: now,
    };
    const subRow = {
      id: "sub_2",
      userId: "user_2",
      plan: "pro",
      status: "active",
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      createdAt: now,
      updatedAt: now,
    };
    // select user (found) → update user returning → select sub (found)
    h.queue.push([existing], [existing], [subRow]);

    const bundle = await ensureUser("user_2", { sub: "user_2" });

    expect(h.getUser).not.toHaveBeenCalled();
    expect(bundle.user.id).toBe("user_2");
    expect(bundle.subscription.plan).toBe("pro");
  });
});
