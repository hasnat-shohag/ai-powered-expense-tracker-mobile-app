/**
 * Slice construction for the Home summary card — the pure half of the donut +
 * legend, kept free of React Native imports so it runs under the Node test run.
 *
 * The card's height is driven by its legend, not by the ring, so an unbounded
 * legend made a many-category month (12+) push the card past half the screen
 * while the donut stayed a fixed 92dp and floated in dead space. The card is
 * therefore capped at LEGEND_MAX_ROWS: past it, the tail is aggregated into a
 * single grey "Other" slice. The ring stays a true whole — the tail's share is
 * still on the ring, just not as its own arc.
 */

import { otherPair, pairFor } from "../../theme";

export interface DonutSegment {
  color: string;
  /** Share of the ring, 0–100. */
  pct: number;
}

export interface CategorySlice extends DonutSegment {
  name: string;
  total: number;
  /** The aggregated tail — an aggregate, not a category: never filterable. */
  isOther?: boolean;
}

/** Rows the legend may occupy before the tail is aggregated. */
export const LEGEND_MAX_ROWS = 6;
/** Named categories kept before aggregation. One row is reserved for Other. */
export const LEGEND_TOP_N = LEGEND_MAX_ROWS - 1;

export interface CategoryTotal {
  category: string;
  total: number;
}

/**
 * Build the display slices for a month: every category while they fit within
 * the row ceiling, otherwise the top five plus one aggregated "Other".
 * `breakdown` is expected largest-first (see `categoryBreakdown`).
 */
export function buildSlices(
  breakdown: CategoryTotal[],
  total: number,
): CategorySlice[] {
  if (total <= 0) return [];

  const all: CategorySlice[] = breakdown.map((b) => ({
    name: b.category,
    total: b.total,
    color: pairFor(b.category).ink,
    pct: (b.total / total) * 100,
  }));

  if (all.length <= LEGEND_MAX_ROWS) return all;

  const head = all.slice(0, LEGEND_TOP_N);
  const tail = all.slice(LEGEND_TOP_N);
  const tailTotal = tail.reduce((sum, s) => sum + s.total, 0);

  return [
    ...head,
    {
      name: `Other (${tail.length})`,
      total: tailTotal,
      color: otherPair.ink,
      pct: (tailTotal / total) * 100,
      isOther: true,
    },
  ];
}

/**
 * The filter chip list. Derived from the raw breakdown, never from the display
 * slices — the Other row is a bucket, and filtering by it would match nothing.
 */
export function filterCategories(breakdown: CategoryTotal[]): string[] {
  return breakdown.map((b) => b.category);
}
