/**
 * Presentation helpers for currency and dates. Both are locale-fixed to the
 * product's context: taka (৳) with Western thousands grouping (matching the
 * comp's `৳ 24,850`), and dates rendered in Asia/Dhaka regardless of the
 * device's own zone, since every expense is stamped in Dhaka local time.
 */

const TAKA = "৳"; // ৳ U+09F3, carried by Noto Sans Bengali

const groupFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** `1820` → `৳ 1,820`. Rounds to whole taka; the ledger carries no paisa. */
export function formatTaka(amount: number): string {
  return `${TAKA} ${groupFmt.format(Math.round(amount))}`;
}

const dayFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "Asia/Dhaka",
});

/** ISO instant → `25 Sep`, in Dhaka local time. */
export function formatDay(iso: string): string {
  return dayFmt.format(new Date(iso));
}

const monthFmt = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "Asia/Dhaka",
});

/** `{year:2026, month:9}` → `September 2026`. month is 1–12. */
export function formatMonthLabel(year: number, month: number): string {
  // Noon UTC on the 1st stays inside the target month after the +6h Dhaka shift.
  return monthFmt.format(new Date(Date.UTC(year, month - 1, 1, 12)));
}
