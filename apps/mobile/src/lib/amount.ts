/**
 * Lenient amount parsing for the expense forms. Users type partial numbers,
 * stray currency glyphs, and separators while editing; the field must never
 * throw or produce NaN. Anything unparseable collapses to 0 (an invalid row the
 * Save gate then blocks), never a crash.
 */

/** Parse a partially-typed amount to a non-negative number (0 on garbage). */
export function parseAmount(t: string): number {
  const n = Number(t.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}
