/**
 * P18.1: Stats Auto-Checker
 *
 * Verifies that ARCHITECTURE.md header stats match the actual code tree.
 * Prevents "stale stats" bugs from recurring.
 *
 * Checks:
 *   - File counts: strict match (src, scripts, test, total)
 *   - LoC counts: tolerance-based (~)
 *   - Test count: optional (--include-tests flag)
 *
 * Usage:
 *   npx tsx scripts/checkStats.ts
 *   npx tsx scripts/checkStats.ts --include-tests
 *
 * ref: P18.1
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname!, "..");
const ARCH_PATH = join(ROOT, "ARCHITECTURE.md");

// ---------------------------------------------------------------------------
// File tree counting
// ---------------------------------------------------------------------------

function countTsFiles(dir: string): { count: number; loc: number } {
  let count = 0;
  let loc = 0;

  function walk(d: string): void {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const fullPath = join(d, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts")) {
        count++;
        const content = readFileSync(fullPath, "utf-8");
        loc += content.split("\n").length;
      }
    }
  }

  walk(dir);
  return { count, loc };
}

// ---------------------------------------------------------------------------
// Parse ARCHITECTURE.md header
// ---------------------------------------------------------------------------

type HeaderStats = {
  srcFiles: number;
  scriptFiles: number;
  testFiles: number;
  totalFiles: number | null;
  srcLoc: number;
  scriptLoc: number;
  testLoc: number;
  totalLoc: number;
  testCount: number | null;
};

function parseHeader(content: string): HeaderStats | null {
  // Match the header line: > Generated: ... | Source: ~20,000 LoC (76 files) | ...
  const headerLine = content.split("\n").find(l => l.startsWith("> Generated:"));
  if (!headerLine) return null;

  const srcMatch = headerLine.match(/Source:\s*~?([\d,]+)\s*LoC\s*\((\d+)\s*files?\)/);
  const scriptMatch = headerLine.match(/Scripts:\s*~?([\d,]+)\s*LoC\s*\((\d+)\s*files?\)/);
  const testMatch = headerLine.match(/Tests:\s*~?([\d,]+)\s*LoC\s*\((\d+)\s*files?\)/);
  const totalMatch = headerLine.match(/Total:\s*~?([\d,]+)\s*LoC(?:\s*\((\d+)\s*files?\))?/);
  const testCountMatch = headerLine.match(/Tests:\s*(\d+)\s*\+/);

  if (!srcMatch || !scriptMatch || !testMatch || !totalMatch) return null;

  return {
    srcFiles: parseInt(srcMatch[2]),
    scriptFiles: parseInt(scriptMatch[2]),
    testFiles: parseInt(testMatch[2]),
    totalFiles: totalMatch[2] ? parseInt(totalMatch[2]) : null,
    srcLoc: parseInt(srcMatch[1].replace(/,/g, "")),
    scriptLoc: parseInt(scriptMatch[1].replace(/,/g, "")),
    testLoc: parseInt(testMatch[1].replace(/,/g, "")),
    totalLoc: parseInt(totalMatch[1].replace(/,/g, "")),
    testCount: testCountMatch ? parseInt(testCountMatch[1]) : null,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  const includeTests = process.argv.includes("--include-tests");

  console.log("📊 Pantheon Stats Auto-Checker");
  console.log("─".repeat(50));

  // Read ARCHITECTURE.md
  const archContent = readFileSync(ARCH_PATH, "utf-8");
  const headerStats = parseHeader(archContent);

  if (!headerStats) {
    console.error("❌ Could not parse ARCHITECTURE.md header");
    process.exit(1);
  }

  // Count actual files
  const srcActual = countTsFiles(join(ROOT, "src"));
  const scriptActual = countTsFiles(join(ROOT, "scripts"));
  const testActual = countTsFiles(join(ROOT, "test"));
  const totalActual = srcActual.count + scriptActual.count + testActual.count;

  // Compare
  type Check = {
    name: string;
    expected: number;
    actual: number;
    strict: boolean;
    tolerance: number; // percentage for LoC
  };

  const checks: Check[] = [
    { name: "Source files", expected: headerStats.srcFiles, actual: srcActual.count, strict: true, tolerance: 0 },
    { name: "Script files", expected: headerStats.scriptFiles, actual: scriptActual.count, strict: true, tolerance: 0 },
    { name: "Test files", expected: headerStats.testFiles, actual: testActual.count, strict: true, tolerance: 0 },
    { name: "Source LoC", expected: headerStats.srcLoc, actual: srcActual.loc, strict: false, tolerance: 15 },
    { name: "Script LoC", expected: headerStats.scriptLoc, actual: scriptActual.loc, strict: false, tolerance: 15 },
    { name: "Test LoC", expected: headerStats.testLoc, actual: testActual.loc, strict: false, tolerance: 15 },
    { name: "Total LoC", expected: headerStats.totalLoc, actual: srcActual.loc + scriptActual.loc + testActual.loc, strict: false, tolerance: 15 },
  ];

  if (headerStats.totalFiles !== null) {
    checks.push({
      name: "Total files",
      expected: headerStats.totalFiles,
      actual: totalActual,
      strict: true,
      tolerance: 0,
    });
  }

  let failures = 0;

  for (const check of checks) {
    if (check.strict) {
      if (check.expected !== check.actual) {
        console.log(`❌ ${check.name}: expected ${check.expected}, actual ${check.actual}`);
        failures++;
      } else {
        console.log(`✅ ${check.name}: ${check.actual}`);
      }
    } else {
      const diff = Math.abs(check.expected - check.actual);
      const pct = check.expected > 0 ? (diff / check.expected) * 100 : 0;
      if (pct > check.tolerance) {
        console.log(`❌ ${check.name}: expected ~${check.expected}, actual ${check.actual} (${pct.toFixed(1)}% drift)`);
        failures++;
      } else {
        console.log(`✅ ${check.name}: ~${check.actual} (header says ~${check.expected}, ${pct.toFixed(1)}% drift OK)`);
      }
    }
  }

  console.log("─".repeat(50));

  if (failures > 0) {
    console.log(`\n❌ ${failures} check(s) failed. Update ARCHITECTURE.md header.`);
    process.exit(1);
  } else {
    console.log("\n✅ All stats match.");
    process.exit(0);
  }
}

main();
