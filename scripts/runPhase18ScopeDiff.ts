/**
 * P18 CLI: runPhase18ScopeDiff.ts
 *
 * Usage:
 *   npx tsx scripts/runPhase18ScopeDiff.ts \
 *     --scope data/dogfood/p10/scoped-handoff/.pantheon/scope.json \
 *     --required-tests data/dogfood/p10/scoped-handoff/.pantheon/required-tests.json \
 *     --changed-files ConflictPolicy.kt,Dtos.kt \
 *     [--diff-file path/to/diff] \
 *     [--test-results path/to/test-results.json] \
 *     [--human-review path/to/human-review.json]
 *
 * ref: P18
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, dirname } from "node:path";
import type { ScopedImplementationBoundaryPackage, RequiredTestsFile } from "../src/scopedHandoff/types.js";
import type { ScopeDiffRequest, TestResult, HumanReviewInput } from "../src/scopeDiff/types.js";
import { validateScopeDiff } from "../src/scopeDiff/scopeDiffValidator.js";
import { renderScopeDiffReportMarkdown } from "../src/scopeDiff/scopeDiffReportRenderer.js";

// ---------------------------------------------------------------------------
// CLI Args
// ---------------------------------------------------------------------------

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag: string): string | undefined => {
    const idx = args.indexOf(flag);
    return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : undefined;
  };

  const scopePath = get("--scope");
  const requiredTestsPath = get("--required-tests");
  const changedFilesRaw = get("--changed-files");
  const diffFile = get("--diff-file");
  const testResultsFile = get("--test-results");
  const humanReviewFile = get("--human-review");

  if (!scopePath || !requiredTestsPath) {
    console.error("Usage: npx tsx scripts/runPhase18ScopeDiff.ts \\");
    console.error("  --scope <scope.json> \\");
    console.error("  --required-tests <required-tests.json> \\");
    console.error("  --changed-files file1,file2,... \\");
    console.error("  [--diff-file <path>] \\");
    console.error("  [--test-results <path>] \\");
    console.error("  [--human-review <path>]");
    process.exit(1);
  }

  return { scopePath, requiredTestsPath, changedFilesRaw, diffFile, testResultsFile, humanReviewFile };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf-8"));
}

function writeOutput(path: string, content: string): void {
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(path, content, "utf-8");
}

function fileHash(content: string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const { scopePath, requiredTestsPath, changedFilesRaw, diffFile, testResultsFile, humanReviewFile } = parseArgs();

  console.log("╔═══════════════════════════════════════════════════════╗");
  console.log("║  P18: Scope Diff Validator                          ║");
  console.log("╚═══════════════════════════════════════════════════════╝");
  console.log();

  // Load inputs
  console.log("  Loading inputs...");
  const scopeRaw = readFileSync(resolve(scopePath!), "utf-8");
  const scope = JSON.parse(scopeRaw) as ScopedImplementationBoundaryPackage;
  const requiredTestsRaw = readFileSync(resolve(requiredTestsPath!), "utf-8");
  const requiredTestsFile = JSON.parse(requiredTestsRaw) as RequiredTestsFile;

  console.log(`  ✅ Scope: ${scope.scope_id}`);
  console.log(`  ✅ Risk: ${scope.summary.risk_level.toUpperCase()}`);

  // Build request
  const request: ScopeDiffRequest = {
    scope_path: scopePath!,
    required_tests_path: requiredTestsPath!,
  };

  if (changedFilesRaw) {
    request.changed_files = changedFilesRaw.split(",").map(f => f.trim()).filter(f => f.length > 0);
    console.log(`  ✅ Changed files: ${request.changed_files.length}`);
  }

  if (diffFile && existsSync(resolve(diffFile))) {
    request.diff_text = readFileSync(resolve(diffFile), "utf-8");
    console.log(`  ✅ Diff file loaded`);
  }

  if (testResultsFile && existsSync(resolve(testResultsFile))) {
    request.test_results = loadJson<TestResult[]>(resolve(testResultsFile));
    console.log(`  ✅ Test results: ${request.test_results.length}`);
  }

  if (humanReviewFile && existsSync(resolve(humanReviewFile))) {
    request.human_review = loadJson<HumanReviewInput>(resolve(humanReviewFile));
    console.log(`  ✅ Human review: ${request.human_review.provided ? "provided" : "not provided"}`);
  }

  // Validate
  console.log("\n  Validating...");
  const report = validateScopeDiff({
    scope,
    requiredTestsFile,
    request,
    scopeHash: fileHash(scopeRaw),
    requiredTestsHash: fileHash(requiredTestsRaw),
  });

  // Output
  const outputBase = resolve(dirname(scopePath!), "..", "reports");
  writeOutput(resolve(outputBase, "scope_diff_report.json"), JSON.stringify(report, null, 2));
  writeOutput(resolve(outputBase, "scope_diff_report.md"), renderScopeDiffReportMarkdown(report));

  // Summary
  const statusIcons: Record<string, string> = { pass: "✅", fail: "❌", requires_reverse_issue: "⚠️", requires_human_review: "🔒" };
  const icon = statusIcons[report.status] || "❓";

  console.log(`\n  ${icon} Status: ${report.status.toUpperCase()}`);
  console.log(`     Violations: ${report.violations.length}`);
  console.log(`     Warnings: ${report.warnings.length}`);

  if (report.blocking_reasons.length > 0) {
    console.log("\n  Blocking reasons:");
    for (const r of report.blocking_reasons) {
      console.log(`  ❌ ${r}`);
    }
  }

  if (report.required_actions.length > 0) {
    console.log("\n  Required actions:");
    for (const a of report.required_actions) {
      console.log(`  → ${a}`);
    }
  }

  console.log(`\n  📁 Output: ${outputBase}`);
  console.log();
}

main();
