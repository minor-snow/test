import { describe, expect, it } from "vitest";
import { matchesPattern } from "../../src/repair/repairUtils.js";

describe("repairUtils: matchesPattern", () => {
  it("matches simple globs", () => {
    expect(matchesPattern("src/index.ts", "src/**/*.ts")).toBe(false);
    expect(matchesPattern("package.json", "package.json")).toBe(true);
    expect(matchesPattern(".github/workflows/ci.yml", ".github/workflows/**")).toBe(true);
    expect(matchesPattern("docs/example.md", ".github/workflows/**")).toBe(false);
  });

  it("handles the | shorthand for multiple globs", () => {
    const pattern = "dist/**|build/**|generated/**|*.d.ts";
    
    expect(matchesPattern("dist/index.js", pattern)).toBe(true);
    expect(matchesPattern("build/main.js", pattern)).toBe(true);
    expect(matchesPattern("generated/client.ts", pattern)).toBe(true);
    expect(matchesPattern("types.d.ts", pattern)).toBe(true);
    expect(matchesPattern("src/buildHelper.ts", pattern)).toBe(false);
  });

  it("handles the specific *.config.{ts,js} brace expansion shorthand", () => {
    const pattern = "tsconfig*.json|*.config.{ts,js}";
    
    expect(matchesPattern("tsconfig.json", pattern)).toBe(true);
    expect(matchesPattern("tsconfig.app.json", pattern)).toBe(true);
    expect(matchesPattern("vite.config.ts", pattern)).toBe(true);
    expect(matchesPattern("rollup.config.js", pattern)).toBe(true);
    expect(matchesPattern("next.config.mjs", pattern)).toBe(true);
    
    expect(matchesPattern("vite.config.json", pattern)).toBe(false);
    expect(matchesPattern("src/config.ts", pattern)).toBe(false);
  });
});
