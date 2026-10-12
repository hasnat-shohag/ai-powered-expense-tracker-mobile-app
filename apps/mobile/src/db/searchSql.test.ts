import { describe, it, expect } from "vitest";
import { buildSearchSql, monthRangeUtc, previousMonth } from "./searchSql";

describe("buildSearchSql", () => {
  it("defaults to active rows, newest first, with just the limit bound", () => {
    const { sql, args } = buildSearchSql({}, 30);
    expect(sql).toContain("deleted_at IS NULL");
    expect(sql).toContain("ORDER BY spent_at DESC, id DESC LIMIT ?");
    expect(args).toEqual([30]);
  });

  it("binds a Dhaka month window", () => {
    const { start, end } = monthRangeUtc({ year: 2026, month: 10 });
    const { sql, args } = buildSearchSql({ month: { year: 2026, month: 10 } }, 50);
    expect(sql).toContain("spent_at >= ? AND spent_at < ?");
    expect(args).toEqual([start, end, 50]);
  });

  it("adds category and payment-method equality filters", () => {
    const { sql, args } = buildSearchSql(
      { category: "food", paymentMethod: "cash" },
      10,
    );
    expect(sql).toContain("category = ?");
    expect(sql).toContain("payment_method = ?");
    expect(args).toEqual(["food", "cash", 10]);
  });

  it("matches NULL payment method for the 'unknown' bucket (no bound value)", () => {
    const { sql, args } = buildSearchSql({ paymentMethod: "unknown" }, 10);
    expect(sql).toContain("payment_method IS NULL");
    expect(args).toEqual([10]);
  });

  it("expands a free-text search across four columns", () => {
    const { sql, args } = buildSearchSql({ search: "cafe" }, 10);
    expect(sql).toContain(
      "(merchant LIKE ? OR description LIKE ? OR category LIKE ? OR raw_input LIKE ?)",
    );
    expect(args).toEqual(["%cafe%", "%cafe%", "%cafe%", "%cafe%", 10]);
  });

  it("appends a keyset cursor before the limit", () => {
    const cursor = "2026-10-09T10:00:00.000Z";
    const { sql, args } = buildSearchSql({ category: "food" }, 10, cursor);
    expect(sql).toContain("spent_at < ?");
    expect(args).toEqual(["food", cursor, 10]);
  });

  it("previousMonth rolls the year at January", () => {
    expect(previousMonth({ year: 2026, month: 1 })).toEqual({ year: 2025, month: 12 });
  });
});
