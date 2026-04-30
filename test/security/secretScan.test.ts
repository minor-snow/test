import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SCAN_DIRS = ["src", "scripts"];
const BLOCKED_PATTERNS = [
  /\?\?\s*["']sk-[A-Za-z0-9_-]{8,}/,
  /DEEPSEEK_API_KEY\s*\?\?\s*["']/,
  /OPENAI_API_KEY\s*\?\?\s*["']/,
  /Bearer\s+[A-Za-z0-9_-]{16,}/,
];

describe("secret scan", () => {
  it("does not keep hardcoded live API key fallbacks in source or scripts", () => {
    const findings: string[] = [];

    for (const dir of SCAN_DIRS) {
      scanDirectory(join(ROOT, dir), findings);
    }

    expect(findings).toEqual([]);
  });
});

function scanDirectory(dir: string, findings: string[]): void {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) {
      scanDirectory(path, findings);
      continue;
    }
    if (!/\.(ts|js|json|md)$/.test(entry)) {
      continue;
    }

    const content = readFileSync(path, "utf-8");
    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(content)) {
        findings.push(path.replace(/\\/g, "/"));
        break;
      }
    }
  }
}
