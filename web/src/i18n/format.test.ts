import { describe, expect, it } from "vitest";

import { formatDate, formatMoney, formatNumber } from "./format.js";

describe("locale-aware presentation formatting", () => {
  it("formats numbers without changing the canonical numeric value", () => {
    const value = 1234.5;

    expect(formatNumber(value, "en")).toBe("1,234.5");
    expect(formatNumber(value, "id")).toBe("1.234,5");
    expect(value).toBe(1234.5);
  });

  it("formats money with locale-specific separators", () => {
    expect(formatMoney(1234.5, "USD", "en")).toContain("1,234.50");
    expect(formatMoney(1234.5, "IDR", "id", { maximumFractionDigits: 0 })).toContain("1.235");
  });

  it("formats the same instant according to the selected locale", () => {
    const instant = new Date(Date.UTC(2026, 8, 16, 0, 0, 0));
    const options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" };

    expect(formatDate(instant, "en", options)).toBe("09/16/2026");
    expect(formatDate(instant, "id", options)).toBe("16/09/2026");
  });
});
