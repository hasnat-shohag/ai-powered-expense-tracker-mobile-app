import { describe, expect, it } from "vitest";
import { formatDay, formatMonthLabel, formatTaka } from "./format";

describe("formatTaka", () => {
  it("prefixes ৳ and groups thousands, Western style", () => {
    expect(formatTaka(1820)).toBe("৳ 1,820");
    expect(formatTaka(24850)).toBe("৳ 24,850");
    expect(formatTaka(0)).toBe("৳ 0");
  });

  it("rounds to whole taka (no paisa)", () => {
    expect(formatTaka(1820.4)).toBe("৳ 1,820");
    expect(formatTaka(1820.6)).toBe("৳ 1,821");
  });
});

describe("formatDay", () => {
  // Month abbreviation spelling ("Sep" vs "Sept") is ICU/locale-build
  // dependent, so assert the day-roll logic (the Asia/Dhaka shift) rather than
  // the exact glyphs.
  it("renders an instant in Asia/Dhaka (+06:00)", () => {
    // 2026-09-25T18:30Z is 2026-09-26 00:30 in Dhaka → next day.
    expect(formatDay("2026-09-25T18:30:00.000Z")).toMatch(/^26 Sep/);
    // Same UTC day, well before the +6h roll → still the 25th.
    expect(formatDay("2026-09-25T10:00:00.000Z")).toMatch(/^25 Sep/);
  });
});

describe("formatMonthLabel", () => {
  it("renders month + year from a 1-12 month", () => {
    expect(formatMonthLabel(2026, 9)).toBe("September 2026");
    expect(formatMonthLabel(2026, 1)).toBe("January 2026");
    expect(formatMonthLabel(2025, 12)).toBe("December 2025");
  });
});
