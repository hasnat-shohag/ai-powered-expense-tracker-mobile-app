import { describe, expect, it } from "vitest";
import { parseAmount } from "./amount";

describe("parseAmount", () => {
  it("parses plain and grouped numbers", () => {
    expect(parseAmount("320")).toBe(320);
    expect(parseAmount("1820.5")).toBe(1820.5);
  });

  it("strips currency glyphs and separators", () => {
    expect(parseAmount("৳ 1,820")).toBe(1820);
    expect(parseAmount("$40")).toBe(40);
  });

  it("collapses empty/garbage to 0, never NaN", () => {
    expect(parseAmount("")).toBe(0);
    expect(parseAmount("abc")).toBe(0);
    expect(parseAmount("-5")).toBe(5); // '-' stripped → 5, still non-negative
  });
});
