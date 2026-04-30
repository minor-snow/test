#!/usr/bin/env tsx
/**
 * P28b Support Matrix Collector
 *
 * Reads all runs/ output from p28b_run_python_matrix.ts and produces:
 *   - summary.json
 *   - summary.md
 *   - support_matrix.md
 *   - gap_taxonomy.json
 *
 * Usage:
 *   npx tsx scripts/p28b_collect_support_matrix.ts
 */

import * as fs from "fs";
import * as path from "path";

const RUNS_DIR = "data/dogfood/p28b_python_matrix/runs";
const OUTPUT_DIR = "data/dogfood/p28b_python_matrix";
const REPO_ROOT = process.cwd();

interface SupportAssessment {
  repo_id: string;
  category: string;
  support_level: string;
  reason: string;
  meets_expected: boolean;
  expected_min_support: string;
  signals: {
    has_layout: boolean;
    has_framework: boolean;
    has_project_role: boolean;
    has_test_mapping: boolean;
    has_risk_preset: boolean;
    python_file_count: number;
    test_file_count: number;
    crash: boolean;
    sanitizer_violations: number;
  };
  gaps: string[];
  notes: string;
}

interface PerformanceResult {
  repo_id: string;
  observation_ms: number;
  python_enhancer_ms: number;
  total_ms: number;
  file_count: number;
  python_file_count: number;
  timeout: boolean;
  timeout_reason?: string;
}

const SUPPORT_ORDER = ["unsupported", "observed_only", "smoke", "supported", "validated"];

function supportRank(level: string): number {
  return SUPPORT_ORDER.indexOf(level);
}

function main(): void {
  const runsDir = path.resolve(REPO_ROOT, RUNS_DIR);
  if (!fs.existsSync(runsDir)) {
    console.error(`Runs directory not found: ${runsDir}`);
    process.exit(1);
  }

  const repoDirs = fs.readdirSync(runsDir).filter(d =>
    fs.statSync(path.join(runsDir, d)).isDirectory()
  );

  const assessments: SupportAssessment[] = [];
  const perfs: PerformanceResult[] = [];
  const allGaps: Record<string, string[]> = {};

  for (const repoId of repoDirs) {
    const assessmentPath = path.join(runsDir, repoId, "support_assessment.json");
    const perfPath = path.join(runsDir, repoId, "performance.json");

    if (fs.existsSync(assessmentPath)) {
      const a: SupportAssessment = JSON.parse(fs.readFileSync(assessmentPath, "utf-8"));
      assessments.push(a);
      for (const gap of a.gaps) {
        allGaps[gap] = allGaps[gap] ?? [];
        allGaps[gap].push(repoId);
      }
    }
    if (fs.existsSync(perfPath)) {
      perfs.push(JSON.parse(fs.readFileSync(perfPath, "utf-8")));
    }
  }

  const total = assessments.length;
  const byLevel = SUPPORT_ORDER.reduce((acc, lvl) => {
    acc[lvl] = assessments.filter(a => a.support_level === lvl).length;
    return acc;
  }, {} as Record<string, number>);

  const smokeOrBetter = assessments.filter(a => supportRank(a.support_level) >= supportRank("smoke")).length;
  const supportedOrBetter = assessments.filter(a => supportRank(a.support_level) >= supportRank("supported")).length;
  const validatedCount = byLevel["validated"] ?? 0;

  const crashes = assessments.filter(a => a.signals.crash).length;
  const sanitizerViolations = assessments.filter(a => a.signals.sanitizer_violations > 0).length;
  const unsupportedWithoutReason = assessments.filter(a => a.support_level === "unsupported" && !a.reason).length;
  const meetsExpected = assessments.filter(a => a.meets_expected).length;

  // Gap taxonomy
  const gapTaxonomy = Object.entries(allGaps)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([kind, repos]) => ({
      gap_id: `p28b_gap_${kind}`,
      kind,
      repos,
      frequency: repos.length,
      impact_pct: Math.round((repos.length / total) * 100),
    }));

  const perfTimes = perfs.filter(p => !p.timeout).map(p => p.total_ms).sort((a, b) => a - b);
  const p50 = perfTimes[Math.floor(perfTimes.length * 0.5)] ?? 0;
  const p95 = perfTimes[Math.floor(perfTimes.length * 0.95)] ?? perfTimes[perfTimes.length - 1] ?? 0;

  const summary = {
    schema_version: "p28b_summary@0.1.0",
    generated_at: new Date().toISOString(),
    repo_count: total,
    support_levels: byLevel,
    rates: {
      smoke_or_better: total > 0 ? Math.round((smokeOrBetter / total) * 100) : 0,
      supported_or_better: total > 0 ? Math.round((supportedOrBetter / total) * 100) : 0,
      validated: total > 0 ? Math.round((validatedCount / total) * 100) : 0,
      meets_expected: total > 0 ? Math.round((meetsExpected / total) * 100) : 0,
    },
    quality_gates: {
      crash_count: crashes,
      sanitizer_violation_repos: sanitizerViolations,
      unsupported_without_reason: unsupportedWithoutReason,
      crash_free: crashes === 0,
      sanitizer_clean: sanitizerViolations === 0,
    },
    performance: {
      completed: perfs.filter(p => !p.timeout).length,
      timeout_count: perfs.filter(p => p.timeout).length,
      p50_ms: p50,
      p95_ms: p95,
    },
    top_gaps: gapTaxonomy.slice(0, 10),
  };

  // Write summary.json
  fs.writeFileSync(
    path.resolve(REPO_ROOT, OUTPUT_DIR, "summary.json"),
    JSON.stringify(summary, null, 2)
  );

  // Write gap_taxonomy.json
  fs.writeFileSync(
    path.resolve(REPO_ROOT, OUTPUT_DIR, "gap_taxonomy.json"),
    JSON.stringify({ schema_version: "p28b_gap_taxonomy@0.1.0", gaps: gapTaxonomy }, null, 2)
  );

  // Write support_matrix.md
  const byCategory = assessments.reduce((acc, a) => {
    acc[a.category] = acc[a.category] ?? [];
    acc[a.category].push(a);
    return acc;
  }, {} as Record<string, SupportAssessment[]>);

  const matrixRows = Object.entries(byCategory).map(([cat, repos]) => {
    const val = repos.filter(r => r.support_level === "validated").length;
    const sup = repos.filter(r => supportRank(r.support_level) >= supportRank("supported")).length;
    const smk = repos.filter(r => supportRank(r.support_level) >= supportRank("smoke")).length;
    const topGap = [...new Set(repos.flatMap(r => r.gaps))].slice(0, 2).join(", ") || "none";
    return `| ${cat} | ${repos.length} | ${val} | ${sup} | ${smk} | ${topGap} |`;
  });

  const supportMatrix = [
    "# P28b Python Support Matrix",
    "",
    `Generated: ${new Date().toISOString().split("T")[0]} | Repos run: ${total}`,
    "",
    "| Category | Repos | validated | supported+ | smoke+ | Common gaps |",
    "|---|---:|---:|---:|---:|---|",
    ...matrixRows,
    "",
    "## Support Level Summary",
    "",
    `| Level | Count | % |`,
    `|---|---|---|`,
    ...SUPPORT_ORDER.map(lvl => `| ${lvl} | ${byLevel[lvl] ?? 0} | ${total > 0 ? Math.round(((byLevel[lvl] ?? 0) / total) * 100) : 0}% |`),
    "",
    "## Quality Gates",
    "",
    `- Crashes: ${crashes === 0 ? "✅ 0" : `❌ ${crashes}`}`,
    `- Sanitizer violations: ${sanitizerViolations === 0 ? "✅ 0" : `❌ ${sanitizerViolations} repos`}`,
    `- Unsupported without reason: ${unsupportedWithoutReason === 0 ? "✅ 0" : `❌ ${unsupportedWithoutReason}`}`,
    "",
    "## Performance",
    "",
    `- p50: ${p50}ms | p95: ${p95}ms | timeouts: ${perfs.filter(p => p.timeout).length}`,
    "",
    "## Top Gaps",
    "",
    ...gapTaxonomy.slice(0, 10).map(g => `- **${g.kind}**: ${g.repos.length} repos (${g.impact_pct}%)`),
  ].join("\n");

  fs.writeFileSync(path.resolve(REPO_ROOT, OUTPUT_DIR, "support_matrix.md"), supportMatrix);

  // Write summary.md
  const summaryMd = [
    "# P28b Python Matrix Summary",
    "",
    `**Generated**: ${new Date().toISOString()} | **Repos run**: ${total}`,
    "",
    "## Rates",
    `- Smoke-or-better: **${summary.rates.smoke_or_better}%** (target: 90%)`,
    `- Supported-or-better: **${summary.rates.supported_or_better}%** (target: 70%)`,
    `- Validated: **${summary.rates.validated}%**`,
    `- Meets expected: **${summary.rates.meets_expected}%**`,
    "",
    "## Quality",
    `- Crashes: ${crashes === 0 ? "✅" : "❌"} ${crashes}`,
    `- Sanitizer: ${sanitizerViolations === 0 ? "✅ clean" : `❌ ${sanitizerViolations} violations`}`,
    "",
    "## Performance",
    `- p50: ${p50}ms | p95: ${p95}ms`,
    "",
    "## Top 5 Gaps",
    ...gapTaxonomy.slice(0, 5).map(g => `- ${g.kind}: ${g.frequency} repos`),
  ].join("\n");

  fs.writeFileSync(path.resolve(REPO_ROOT, OUTPUT_DIR, "summary.md"), summaryMd);

  // Console output
  console.log("\n=== P28b Support Matrix ===");
  console.log(`Repos: ${total}`);
  console.log(`Smoke+: ${summary.rates.smoke_or_better}% | Supported+: ${summary.rates.supported_or_better}% | Validated: ${summary.rates.validated}%`);
  console.log(`Crashes: ${crashes} | Sanitizer violations: ${sanitizerViolations}`);
  console.log(`Performance p50: ${p50}ms p95: ${p95}ms`);
  console.log(`\nTop gaps: ${gapTaxonomy.slice(0, 5).map(g => `${g.kind}(${g.frequency})`).join(", ")}`);
  console.log(`\nOutputs written to ${OUTPUT_DIR}/`);
}

main();
