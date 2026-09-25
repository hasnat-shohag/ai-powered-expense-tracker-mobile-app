import { describe, it, expect } from "vitest";
import {
  parseResultSchema,
  syncRequestSchema,
  expenseSchema,
} from "./src/index.js";

describe("parseResultSchema", () => {
  it("accepts an array of line items and applies defaults", () => {
    const out = parseResultSchema.parse([
      { amount: "12.5", category: "food", spentAt: "2026-09-25T10:00:00Z" },
    ]);
    expect(out[0]!.amount).toBe(12.5);
    expect(out[0]!.currency).toBe("BDT");
    expect(out[0]!.paymentMethod).toBeNull();
  });

  it("rejects a negative amount", () => {
    const r = parseResultSchema.safeParse([
      { amount: -5, category: "food", spentAt: "2026-09-25T10:00:00Z" },
    ]);
    expect(r.success).toBe(false);
  });

  it("rejects a non-ISO spentAt", () => {
    const r = parseResultSchema.safeParse([
      { amount: 5, category: "food", spentAt: "yesterday" },
    ]);
    expect(r.success).toBe(false);
  });
});

describe("syncRequestSchema", () => {
  it("defaults since to null and ops to empty", () => {
    const out = syncRequestSchema.parse({});
    expect(out.since).toBeNull();
    expect(out.ops).toEqual([]);
  });
});

describe("expenseSchema", () => {
  it("round-trips a full row", () => {
    const row = {
      id: "018f0000-0000-7000-8000-000000000000",
      groupId: "018f0000-0000-7000-8000-000000000001",
      amount: 100,
      category: "groceries",
      source: "text",
      spentAt: "2026-09-25T10:00:00Z",
      createdAt: "2026-09-25T10:00:00Z",
      updatedAt: "2026-09-25T10:00:00Z",
    };
    const out = expenseSchema.parse(row);
    expect(out.currency).toBe("BDT");
    expect(out.deletedAt).toBeNull();
    expect(out.receiptKey).toBeNull();
  });
});
