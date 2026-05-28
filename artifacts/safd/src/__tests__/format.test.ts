import { describe, it, expect } from "vitest";
import { formatNumber, formatDate } from "../lib/format";

describe("formatNumber()", () => {
  it("formats numbers below 1000 as-is", () => {
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(999)).toBe("999");
  });

  it("formats thousands with k suffix", () => {
    expect(formatNumber(1000)).toBe("1.0k");
    expect(formatNumber(1500)).toBe("1.5k");
    expect(formatNumber(999999)).toBe("1000.0k");
  });

  it("formats millions with M suffix", () => {
    expect(formatNumber(1000000)).toBe("1.0M");
    expect(formatNumber(2500000)).toBe("2.5M");
  });
});

describe("formatDate()", () => {
  it("formats a date string to readable format", () => {
    const result = formatDate("2024-01-15T00:00:00.000Z");
    expect(result).toMatch(/Jan/);
    expect(result).toMatch(/15/);
    expect(result).toMatch(/2024/);
  });

  it("returns a non-empty string for valid dates", () => {
    const result = formatDate("2023-12-31T00:00:00.000Z");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});
