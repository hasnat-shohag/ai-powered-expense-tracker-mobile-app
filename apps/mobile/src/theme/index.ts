/**
 * Design tokens for the Home screen, transcribed from DESIGN.md ("The Calm
 * Ledger"). This is the single source of visual truth for the RN app — colors,
 * the type ramp, spacing, radii, and the four category pairs. Screens and
 * components read from here rather than hard-coding values.
 */

import type { TextStyle } from "react-native";

export const colors = {
  ground: "#FFFFFF",
  ink: "#111827",
  muted: "#6B7280",
  line: "#E5E7EB",
  /** The single loud color: the add gesture and its shadow only. */
  actionBlue: "#2563EB",
  /** Up-trend delta and Groceries ink — one green, two consistent meanings. */
  positiveGreen: "#2F7A3E",
  surfaceSunken: "#FAFAFA",
  fillTrack: "#F3F4F6",
  chipOffInk: "#374151",
} as const;

/** Pale tint fill under a saturated ink mark — the Category-Pair Rule. */
export interface CategoryPair {
  tint: string;
  ink: string;
}

/**
 * The four documented category pairs. Keys are the canonical category slugs
 * used across the app; `catchAll` backs any category not in the core four so a
 * server-sent label never renders without a tile.
 */
export const categoryPairs = {
  Food: { tint: "#FDE7C7", ink: "#B4741B" },
  Transport: { tint: "#DCE9FB", ink: "#2C5FA8" },
  Groceries: { tint: "#E3F2E1", ink: "#2F7A3E" },
  Health: { tint: "#F3E1F3", ink: "#8A3E8A" },
} as const satisfies Record<string, CategoryPair>;

export type CategoryName = keyof typeof categoryPairs;

/** Fallback pair (Food amber) for uncategorized or unknown categories. */
export const catchAllPair: CategoryPair = categoryPairs.Food;

export function pairFor(category: string | null | undefined): CategoryPair {
  if (category && category in categoryPairs) {
    return categoryPairs[category as CategoryName];
  }
  return catchAllPair;
}

/** Font family names as registered by useFonts in theme/fonts.ts. */
export const fonts = {
  regular: "Roboto_400Regular",
  medium: "Roboto_500Medium",
  bold: "Roboto_700Bold",
} as const;

/**
 * The type ramp. One large number (display, 42px) over a dense 12–15px field;
 * no mid-range headline (the One-Big-Number Rule). Amounts pair these sizes
 * with the tabular-nums style from the `tabular` helper below.
 */
export const type = {
  display: { fontFamily: fonts.bold, fontSize: 42, letterSpacing: -0.84 },
  title: { fontFamily: fonts.bold, fontSize: 15 },
  body: { fontFamily: fonts.medium, fontSize: 14 },
  label: { fontFamily: fonts.medium, fontSize: 13 },
  caption: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
} as const;

/** Android tabular-figures variant so the taka column aligns down the ledger. */
export const tabular: Pick<TextStyle, "fontVariant"> = {
  fontVariant: ["tabular-nums"],
};

export const space = {
  gapTight: 8,
  gap: 13,
  padCard: 16,
  inset: 20,
  section: 24,
} as const;

export const radius = {
  md: 12,
  lg: 16,
  full: 999,
} as const;

/** The two sanctioned shadows (Elevation & Depth). All else separates by hairline. */
export const shadow = {
  /** Nearly imperceptible lift under the list card. */
  card: {
    shadowColor: "#111827",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  /** The one pronounced, blue-tinted lift — the FAB. */
  fab: {
    shadowColor: colors.actionBlue,
    shadowOpacity: 0.32,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
} as const;
