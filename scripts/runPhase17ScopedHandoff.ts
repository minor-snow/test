/**
 * P17 CLI: runPhase17ScopedHandoff.ts
 *
 * Usage:
 *   npx tsx scripts/runPhase17ScopedHandoff.ts \
 *     --blast data/dogfood/p10/boundary/blast_radius_report.json \
 *     --locale zh-CN \
 *     --label "sync-conflict-policy-change"
 *
 * Produces all .pantheon/ and .cursor/ files under:
 *   data/dogfood/p10/scoped-handoff/
 *
 * ref: P17
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, dirname } from "node:path";
import { buildScopedImplementationBoundaryPackage, buildHandoffReference } from "../src/scopedHandoff/scopedHandoffExporter.js";
import { renderCursorRules } from "../src/scopedHandoff/cursorRulesRenderer.js";
import { renderReverseIssueInstructions, renderPantheonReadme, renderForbiddenAssumptions } from "../src/scopedHandoff/reverseIssueRenderer.js";
import { validateScopedImplementationBoundaryPackage, buildScopedHandoffReport, renderScopedHandoffReportMarkdown } from "../src/scopedHandoff/scopedHandoffValidator.js";
import type { BoundaryGraph } from "../src/boundary/boundaryTypes.js";
import type { BlastRadiusReport } from "../src/boundary/blastRadius.js";
import type { ScopedHandoffInput } from "../src/scopedHandoff/types.js";

// ---------------------------------------------------------------------------
// CLI Args
// ---------------------------------------------------------------------------

function parseArgs(): { blastPath: string; locale: "en" | "zh-CN"; label?: string } {
  const args = process.argv.slice(2);
  let blastPath = "";
  let locale: "en" | "zh-CN" = "en";
  let label: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--blast" && args[i + 1]) blastPath = args[++i];
    else if (args[i] === "--locale" && args[i + 1]) locale = args[++i] as "en" | "zh-CN";
    else if (args[i] === "--label" && args[i + 1]) label = args[++i];
  }

  if (!blastPath) {
    console.error("Usage: npx tsx scripts/runPhase17ScopedHandoff.ts --blast <blast_radius_report.json> [--locale en|zh-CN] [--label <scope_label>]");
    process.exit(1);
  }

  return { blastPath, locale, label };
}

// ---------------------------------------------------------------------------
// File helpers
// ---------------------------------------------------------------------------

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf-8"));
}

function writeOutput(path: string, content: string): void {
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(path, content, "utf-8");
}

function fileHash(path: string): string {
  const data = readFileSync(path);
  return createHash("sha256").update(data).digest("hex").slice(0, 16);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const { blastPath, locale, label } = parseArgs();

  console.log("╔═══════════════════════════════════════════════════════╗");
  console.log("║  P17: Scoped Implementation Boundary Protocol       ║");
  console.log("╚═══════════════════════════════════════════════════════╝");
  console.log();

  // Resolve data paths
  const base = resolve(dirname(blastPath), "..");
  const graphPath = resolve(base, "boundary", "boundary_graph.json");
  const handoffPath = resolve(base, "handoff", "handoff_package.json");
  const outputBase = resolve(base, "scoped-handoff");

  // Load inputs
  console.log("  Loading inputs...");
  const blastRadiusReport = loadJson<BlastRadiusReport>(resolve(blastPath));
  const boundaryGraph = loadJson<BoundaryGraph>(graphPath);

  const handoffPackageHash = existsSync(handoffPath) ? fileHash(handoffPath) : "unknown";

  console.log(`  ✅ Blast radius: ${blastRadiusReport.summary.total_downstream} downstream, ${blastRadiusReport.summary.highest_risk_level.toUpperCase()} risk`);
  console.log(`  ✅ Boundary graph: ${boundaryGraph.stats.node_count} nodes, ${boundaryGraph.stats.edge_count} edges`);

  // Build package
  console.log("\n  Building scoped package...");
  const options: ScopedHandoffInput = {
    locale,
    scopeLabel: label,
    extraForbiddenPatterns: [
      "ui/**",
      "navigation/**",
      "theme/**",
      "build/**",
      "gradle/**",
    ],
  };

  const pkg = buildScopedImplementationBoundaryPackage({
    handoffPackageHash,
    boundaryGraph,
    blastRadiusReport: blastRadiusReport,
    options,
  });

  console.log(`  ✅ Scope: ${pkg.scope_id}`);
  console.log(`  ✅ Risk: ${pkg.summary.risk_level.toUpperCase()}, human review: ${pkg.summary.must_require_human_review}`);
  console.log(`  ✅ Allowed files: ${pkg.allowed_files.length}`);
  console.log(`  ✅ Required tests: ${pkg.required_tests.length}`);
  console.log(`  ✅ Must-preserve: ${pkg.must_preserve.length}`);
  console.log(`  ✅ Forbidden assumptions: ${pkg.forbidden_assumptions.length}`);
  console.log(`  ✅ Reverse issue triggers: ${pkg.reverse_issue_required_if.length}`);

  // Render outputs
  console.log("\n  Rendering outputs...");

  // .pantheon/
  const pantheonDir = resolve(outputBase, ".pantheon");
  const scopeJson = JSON.stringify(pkg, null, 2);
  const scopeHash = createHash("sha256").update(scopeJson).digest("hex").slice(0, 16);
  writeOutput(resolve(pantheonDir, "scope.json"), scopeJson);
  writeOutput(resolve(pantheonDir, "blast-radius.json"), JSON.stringify(blastRadiusReport, null, 2));
  writeOutput(resolve(pantheonDir, "required-tests.json"), JSON.stringify({
    scope_id: pkg.scope_id,
    source_scope_hash: scopeHash,
    generated_at: pkg.created_at,
    required_tests: pkg.required_tests,
  }, null, 2));
  writeOutput(resolve(pantheonDir, "README.md"), renderPantheonReadme());
  writeOutput(resolve(pantheonDir, "reverse-issue.md"), renderReverseIssueInstructions(pkg));
  writeOutput(resolve(pantheonDir, "forbidden-assumptions.md"), renderForbiddenAssumptions(pkg));

  // .pantheon/handoff.json — reference-only
  const handoffRef = buildHandoffReference(
    handoffPackageHash,
    handoffPath,
    blastRadiusReport,
    boundaryGraph,
  );
  writeOutput(resolve(pantheonDir, "handoff.json"), JSON.stringify(handoffRef, null, 2));

  // .cursor/
  const cursorRules = renderCursorRules(pkg);
  writeOutput(resolve(outputBase, ".cursor", "rules", "pantheon-boundaries.md"), cursorRules);

  // Validate
  console.log("\n  Validating...");
  const validation = validateScopedImplementationBoundaryPackage(pkg, cursorRules);

  const outputs = [
    ".pantheon/scope.json",
    ".pantheon/blast-radius.json",
    ".pantheon/handoff.json",
    ".pantheon/required-tests.json",
    ".pantheon/forbidden-assumptions.md",
    ".pantheon/reverse-issue.md",
    ".pantheon/README.md",
    ".cursor/rules/pantheon-boundaries.md",
    "reports/scoped_handoff_report.json",
    "reports/scoped_handoff_report.md",
  ];

  const report = buildScopedHandoffReport(pkg, validation, outputs);

  // Reports
  writeOutput(resolve(outputBase, "reports", "scoped_handoff_report.json"), JSON.stringify(report, null, 2));
  writeOutput(resolve(outputBase, "reports", "scoped_handoff_report.md"), renderScopedHandoffReportMarkdown(report));

  // Summary
  const statusIcon = report.status === "ready" ? "✅" : report.status === "ready_with_warnings" ? "⚠️" : "❌";
  console.log(`  ${statusIcon} Status: ${report.status}`);
  console.log(`     Errors: ${validation.error_count}`);
  console.log(`     Warnings: ${validation.warning_count}`);

  if (validation.entries.length > 0) {
    console.log("\n  Validation entries:");
    for (const e of validation.entries) {
      const icon = e.severity === "error" ? "❌" : e.severity === "warning" ? "⚠️" : "ℹ️";
      console.log(`  ${icon} [${e.check_id}] ${e.message}`);
    }
  }

  console.log(`\n  📁 Output: ${outputBase}`);
  console.log();
}

main();
