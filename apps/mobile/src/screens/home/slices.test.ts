import { describe, expect, it } from "vitest";
import {
  buildSlices,
  filterCategories,
  LEGEND_MAX_ROWS,
  LEGEND_TOP_N,
} from "./slices";

const b = (category: string, total: number) => ({ category, total });

/** Sum of every slice's share of the ring. */
const ringTotal = (slices: { pct: number }[]) =>
  slices.reduce((sum, s) => sum + s.pct, 0);

describe("buildSlices", () => {
  it("returns nothing for a month with no spend", () => {
    expect(buildSlices([b("Food", 0)], 0)).toEqual([]);
  });

  it("keeps every category while they fit the row ceiling", () => {
    const breakdown = [
      b("Groceries", 2598),
      b("Health", 1204),
      b("Clothing", 944),
      b("Personal Care", 650),
      b("Transportation", 430),
      b("Household", 100),
    ];
    const slices = buildSlices(breakdown, 5926);

    expect(slices).toHaveLength(LEGEND_MAX_ROWS);
    expect(slices.map((s) => s.name)).toEqual(breakdown.map((x) => x.category));
    expect(slices.some((s) => s.isOther)).toBe(false);
  });

  it("aggregates the tail into one Other slice past the ceiling", () => {
    const breakdown = Array.from({ length: 12 }, (_, i) =>
      b(`Cat ${i}`, 100 - i),
    );
    const total = breakdown.reduce((sum, x) => sum + x.total, 0);
    const slices = buildSlices(breakdown, total);

    expect(slices).toHaveLength(LEGEND_MAX_ROWS);
    expect(slices.slice(0, LEGEND_TOP_N).map((s) => s.name)).toEqual(
      breakdown.slice(0, LEGEND_TOP_N).map((x) => x.category),
    );

    const other = slices[LEGEND_TOP_N]!;
    expect(other.isOther).toBe(true);
    expect(other.name).toBe(`Other (${12 - LEGEND_TOP_N})`);
    expect(other.total).toBe(
      breakdown.slice(LEGEND_TOP_N).reduce((sum, x) => sum + x.total, 0),
    );
  });

  it("keeps the ring whole after aggregation", () => {
    const breakdown = Array.from({ length: 12 }, (_, i) => b(`Cat ${i}`, 100));
    const slices = buildSlices(breakdown, 1200);

    expect(ringTotal(slices)).toBeCloseTo(100, 10);
    expect(slices[LEGEND_TOP_N]!.pct).toBeCloseTo((700 / 1200) * 100, 10);
  });

  it("never spends a row on Other when there is only one tail category", () => {
    // 7 categories: 6 named would still overflow, so the tail merges by design,
    // but a tail of exactly one is the cheapest case of that rule.
    const breakdown = [
      b("A", 700),
      b("B", 600),
      b("C", 500),
      b("D", 400),
      b("E", 300),
      b("F", 200),
      b("G", 100),
    ];
    const slices = buildSlices(breakdown, 2800);

    expect(slices).toHaveLength(LEGEND_MAX_ROWS);
    const other = slices[LEGEND_TOP_N]!;
    expect(other.name).toBe("Other (2)");
    expect(other.total).toBe(300);
  });

  it("never paints an unclassified category in a core category's ink", () => {
    // The defect this guards: every category outside the documented four fell
    // back to the Food amber, so the ring showed four categories as one arc
    // that read as a single Food total.
    const slices = buildSlices(
      [b("Clothing", 500), b("Personal Care", 400), b("Transportation", 300)],
      1200,
    );
    const coreInks = ["#B4741B", "#2C5FA8", "#2F7A3E", "#8A3E8A"];

    for (const s of slices) {
      expect(coreInks).not.toContain(s.color);
    }
  });

  it("paints the Other bucket in a different ink than an unclassified one", () => {
    const breakdown = Array.from({ length: 8 }, (_, i) => b(`Unknown ${i}`, 100));
    const slices = buildSlices(breakdown, 800);
    const other = slices[LEGEND_TOP_N]!;

    expect(other.isOther).toBe(true);
    expect(other.color).not.toBe(slices[0]!.color);
  });
});

describe("filterCategories", () => {
  it("lists real categories only, so no chip can filter to nothing", () => {
    const breakdown = Array.from({ length: 12 }, (_, i) => b(`Cat ${i}`, 10));
    const chips = filterCategories(breakdown);

    expect(chips).toHaveLength(12);
    expect(chips.some((c) => c.startsWith("Other"))).toBe(false);
  });
});
