/**
 * P25c: Saleor Boundary Proposal
 *
 * Generates a formal Saleor boundary package for the eco-packaging checkout
 * scenario using Pantheon's public guard workflow.
 *
 * Run:
 *   npx tsx scripts/p25c_saleor_boundary_proposal.ts
 *   npx tsx scripts/p25c_saleor_boundary_proposal.ts --repo H:\Boom\salary
 */

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { cmdGuard } from "../src/cli/cmdGuard.js";
import { publicPaths, internalPaths } from "../src/cli/artifactLayout.js";

const args = process.argv.slice(2);

function getFlag(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : undefined;
}

const repoRoot = resolve(getFlag("repo") ?? resolve("..", "salary"));
const outputDir = resolve(getFlag("output") ?? "data/dogfood/p25-saleor/p25c_boundary_proposal");

const intent = "Add an eco-packaging fee during checkout for selected product types.";
const allowedPatterns = [
  "saleor/checkout/**",
  "saleor/graphql/checkout/**",
];
const reviewPatterns = [
  "saleor/tax/**",
  "saleor/order/**",
  "tests/integration/**",
];
const forbiddenPatterns = [
  "saleor/payment/**",
  "saleor/account/**",
  "saleor/discount/**",
  "saleor/plugins/**",
  "migrations/**",
  "saleor/checkout/migrations/**",
  "saleor/order/migrations/**",
  "saleor/tax/migrations/**",
  "saleor/core/settings.py",
];

console.log("P25c: Saleor Boundary Proposal\n");
console.log(`  Repo: ${repoRoot}`);
console.log(`  Output: ${outputDir}`);
console.log("");

cmdGuard({
  repoRoot,
  intent,
  scopePatterns: allowedPatterns,
  reviewPatterns,
  forbiddenPatterns,
});

const pub = publicPaths(repoRoot);
const int = internalPaths(repoRoot);
const outputPantheonDir = join(outputDir, ".pantheon");

rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, ".pantheon"), outputPantheonDir, { recursive: true });

const scope = JSON.parse(readFileSync(int.scope, "utf-8")) as {
  allowed_files: string[];
  review_required_files: Array<{ path: string; reasons: string[] }>;
  forbidden_patterns: Array<{ pattern: string; reason: string }>;
  required_tests: string[];
};
const check = JSON.parse(readFileSync(pub.check, "utf-8")) as {
  summary: {
    changed_files: number;
    in_scope: number;
    review_required: number;
    outside_scope: number;
    forbidden: number;
  };
};

const summary = {
  phase: "P25c",
  subject: "Saleor",
  scenario: "eco_packaging_fee_checkout",
  intent,
  repo_root: repoRoot,
  output_dir: outputDir,
  boundaries: {
    allowed_patterns: allowedPatterns,
    review_required_patterns: reviewPatterns,
    forbidden_patterns: forbiddenPatterns,
  },
  resolved_scope: {
    allowed_file_count: scope.allowed_files.length,
    review_required_file_count: scope.review_required_files.length,
    forbidden_pattern_count: scope.forbidden_patterns.length,
    required_test_count: scope.required_tests.length,
  },
  guard_baseline: check.summary,
  artifacts: {
    task_md: ".pantheon/task.md",
    scope_md: ".pantheon/scope.md",
    python_report_md: existsSync(join(outputPantheonDir, "python_report.md")) ? ".pantheon/python_report.md" : null,
    check_json: ".pantheon/check.json",
    internal_scope_json: ".pantheon/internal/agent_scope.json",
    internal_contract_json: ".pantheon/internal/change_contract_lite.json",
  },
  conclusions: [
    "Saleor is ready for explicit-scope governance.",
    "This boundary package is file/path-level only; automatic intent-to-scope inference remains out of scope.",
    "P25d should use this package as the source of truth for synthetic PR checking.",
  ],
};

writeFileSync(join(outputDir, "boundary_proposal_summary.json"), JSON.stringify(summary, null, 2));
writeFileSync(join(outputDir, "boundary_proposal_notes.md"), renderNotes(summary));

console.log(`  Allowed files: ${scope.allowed_files.length}`);
console.log(`  Review-required files: ${scope.review_required_files.length}`);
console.log(`  Forbidden patterns: ${scope.forbidden_patterns.length}`);
console.log("");
console.log(`  -> Wrote ${join(outputDir, ".pantheon")}`);
console.log(`  -> Wrote ${join(outputDir, "boundary_proposal_summary.json")}`);
console.log(`  -> Wrote ${join(outputDir, "boundary_proposal_notes.md")}`);

function renderNotes(summaryInput: typeof summary): string {
  return [
    "# P25c Saleor Boundary Proposal",
    "",
    `**Intent:** ${summaryInput.intent}`,
    "",
    "## Allowed",
    ...summaryInput.boundaries.allowed_patterns.map(pattern => `- \`${pattern}\``),
    "",
    "## Review-required",
    ...summaryInput.boundaries.review_required_patterns.map(pattern => `- \`${pattern}\``),
    "",
    "## Forbidden",
    ...summaryInput.boundaries.forbidden_patterns.map(pattern => `- \`${pattern}\``),
    "",
    "## Resolved Scope",
    `- Allowed files: ${summaryInput.resolved_scope.allowed_file_count}`,
    `- Review-required files: ${summaryInput.resolved_scope.review_required_file_count}`,
    `- Required tests: ${summaryInput.resolved_scope.required_test_count}`,
    "",
    "## Conclusions",
    ...summaryInput.conclusions.map(line => `- ${line}`),
    "",
    "---",
    "_Auto-generated by Pantheon P25c._",
    "",
  ].join("\n");
}
