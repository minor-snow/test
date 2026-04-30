import { formatCurrency } from "../../src/utils/format.js";
import { describe, it, expect } from "vitest";

describe("format", () => {
  it("should format currency", () => {
    expect(formatCurrency(42)).toBe("$42.00");
  });
});
