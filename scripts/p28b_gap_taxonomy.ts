#!/usr/bin/env tsx
/**
 * P28b-1 Step 3: Gap Taxonomy Generator
 *
 * Reads baseline_raw/aggregate.json and produces:
 *   - gap_taxonomy.json  (structured gap data)
 *   - gap_taxonomy.md    (human readable, prioritized)
 *
 * Gap classification:
 *   P0 (BLOCKER):  crash, sanitizer_violation, false_forbidden
 *   P1 (HIGH):     framework_detection_gap (common repo), project_role_gap, layout_classification_gap
 *   P2 (MEDIUM):   test_mapping_gap, risk_preset_gap, unknowns_too_high
 *   P3 (LOW):      monorepo_boundary_gap, performance_timeout, artifact_noise
 *
 * Usage:
 *   npx tsx scripts/p28b_gap_taxonomy.ts
 */

import { join, resolve, dirname } from "node:path";
import { existsSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import * as url from "node:url";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));
const PANTHEON_ROOT = resolve(__dirname, "..");
const BASELINE_RAW_DIR = join(PANTHEON_ROOT, "data", "dogfood", "p28b_python_matrix", "baseline_raw");
const OUTPUT_DIR = join(PANTHEON_ROOT, "data", "dogfood", "p28b_python_matrix");

function log(msg: string) { console.log(`[P28b-gaps] ${msg}`); }

interface GapEntry {
  gap_id: string;
  kind: string;
  priority: "P0_blocker" | "P1_high" | "P2_medium" | "P3_low";
  description: string;
  affected_repos: string[];
  affected_categories: string[];
  frequency: number;
  impact_pct: number;
  fix_approach: string;
  fix_effort: "trivial" | "small" | "medium" | "large";
  deferred: boolean;
  defer_reason?: string;
}

interface RepoResult {
  repo_id: string;
  category: string;
  support_level: string;
  meets_expected: boolean;
  expected_min_support: string;
  gaps: string[];
  timeout: boolean;
  crash: boolean;
  sanitizer_clean: boolean;
  scan_ms: number;
  python_file_count: number;
  notes: string;
}

const GAP_DEFINITIONS: Record<string, Omit<GapEntry, "affected_repos" | "affected_categories" | "frequency" | "impact_pct">> = {
  crash: {
    gap_id: "crash",
    kind: "crash",
    priority: "P0_blocker",
    description: "Unhandled exception during observation pipeline",
    fix_approach: "Investigate crash trace, add try/catch and graceful degradation",
    fix_effort: "medium",
    deferred: false,
  },
  sanitizer_violation: {
    gap_id: "sanitizer_violation",
    kind: "sanitizer_violation",
    priority: "P0_blocker",
    description: "Public artifact contains absolute local paths (privacy leak)",
    fix_approach: "Strip absolute paths in artifact renderers, use relative or repo-relative paths",
    fix_effort: "small",
    deferred: false,
  },
  layout_classification_gap: {
    gap_id: "layout_classification_gap",
    kind: "layout_classification_gap",
    priority: "P1_high",
    description: "Primary layout not detected with sufficient confidence (>= medium)",
    fix_approach: "Expand pythonLayoutClassifier evidence signals; add more detection rules for src/, flat_package, namespace patterns",
    fix_effort: "medium",
    deferred: false,
  },
  framework_detection_gap: {
    gap_id: "framework_detection_gap",
    kind: "framework_detection_gap",
    priority: "P1_high",
    description: "No framework detected at high/medium confidence despite evidence available",
    fix_approach: "Require 2+ evidence dimensions for high confidence; improve pythonFrameworkDetector patterns for new frameworks",
    fix_effort: "medium",
    deferred: false,
  },
  project_role_gap: {
    gap_id: "project_role_gap",
    kind: "project_role_gap",
    priority: "P1_high",
    description: "No project_role classified — results in generic observation without governance context",
    fix_approach: "Improve pythonFrameworkDetector project_role_signals; ensure framework → role mapping covers CLI, SDK, service, pipeline",
    fix_effort: "medium",
    deferred: false,
  },
  test_mapping_gap: {
    gap_id: "test_mapping_gap",
    kind: "test_mapping_gap",
    priority: "P2_medium",
    description: "No test files mapped to source files — test mapping = 0",
    fix_approach: "Improve pythonTestMapper path conventions; expand test discovery patterns (tests/, test/, *_test.py)",
    fix_effort: "small",
    deferred: false,
  },
  risk_preset_gap: {
    gap_id: "risk_preset_gap",
    kind: "risk_preset_gap",
    priority: "P2_medium",
    description: "Risk preset not matched or unvalidated — cannot suggest review/forbidden zones",
    fix_approach: "Expand pythonRiskPresetValidator pattern library for detected project types; fallback to generic_service when uncertain",
    fix_effort: "medium",
    deferred: false,
  },
  timeout: {
    gap_id: "timeout",
    kind: "performance_timeout",
    priority: "P3_low",
    description: "Repo scan exceeded 2-minute budget → fell back to observed_only",
    fix_approach: "Monorepo and very large repos: allowed to timeout into observed_only by design. Only investigate if common repo type.",
    fix_effort: "large",
    deferred: true,
    defer_reason: "By design: monorepo/very-large repos → observed_only. Not a P28b-1 blocker.",
  },
  monorepo_boundary_gap: {
    gap_id: "monorepo_boundary_gap",
    kind: "monorepo_boundary_gap",
    priority: "P3_low",
    description: "Monorepo structure not decomposed into individual package roles",
    fix_approach: "Monorepo: output partial package map, stay at observed_only. Do not hallucinate single root.",
    fix_effort: "large",
    deferred: true,
    defer_reason: "P28b policy: monorepo defaults to observed_only. Decomposition is P28b-3+ scope.",
  },
};

function main() {
  const aggregatePath = join(BASELINE_RAW_DIR, "aggregate.json");
  if (!existsSync(aggregatePath)) {
    console.error(`aggregate.json not found: ${aggregatePath}`);
    console.error("Run p28b_baseline_raw.ts first.");
    process.exit(1);
  }

  const aggregate = JSON.parse(readFileSync(aggregatePath, "utf-8"));
  const repos: RepoResult[] = aggregate.repos;
  const totalRepos = repos.length;

  log(`Processing ${totalRepos} repos from raw baseline...`);

  // Collect gaps from aggregate top_gaps
  const gapRepoMap: Record<string, { repos: string[]; categories: string[] }> = {};

  for (const repo of repos) {
    // Explicit gaps from support_assessment
    for (const gap of repo.gaps) {
      gapRepoMap[gap] = gapRepoMap[gap] ?? { repos: [], categories: [] };
      if (!gapRepoMap[gap].repos.includes(repo.repo_id)) gapRepoMap[gap].repos.push(repo.repo_id);
      if (!gapRepoMap[gap].categories.includes(repo.category)) gapRepoMap[gap].categories.push(repo.category);
    }
    // Explicit crash / sanitizer
    if (repo.crash) {
      gapRepoMap["crash"] = gapRepoMap["crash"] ?? { repos: [], categories: [] };
      if (!gapRepoMap["crash"].repos.includes(repo.repo_id)) gapRepoMap["crash"].repos.push(repo.repo_id);
      if (!gapRepoMap["crash"].categories.includes(repo.category)) gapRepoMap["crash"].categories.push(repo.category);
    }
    if (!repo.sanitizer_clean) {
      gapRepoMap["sanitizer_violation"] = gapRepoMap["sanitizer_violation"] ?? { repos: [], categories: [] };
      if (!gapRepoMap["sanitizer_violation"].repos.includes(repo.repo_id)) gapRepoMap["sanitizer_violation"].repos.push(repo.repo_id);
      if (!gapRepoMap["sanitizer_violation"].categories.includes(repo.category)) gapRepoMap["sanitizer_violation"].categories.push(repo.category);
    }
    if (repo.timeout) {
      gapRepoMap["timeout"] = gapRepoMap["timeout"] ?? { repos: [], categories: [] };
      if (!gapRepoMap["timeout"].repos.includes(repo.repo_id)) gapRepoMap["timeout"].repos.push(repo.repo_id);
      if (!gapRepoMap["timeout"].categories.includes(repo.category)) gapRepoMap["timeout"].categories.push(repo.category);
    }
  }

  // Build gap taxonomy
  const PRIORITY_ORDER = ["P0_blocker", "P1_high", "P2_medium", "P3_low"];
  const gaps: GapEntry[] = Object.entries(gapRepoMap)
    .map(([kind, data]) => {
      const def = GAP_DEFINITIONS[kind];
      if (!def) {
        // Unknown gap — classify as P2 medium
        return {
          gap_id: kind,
          kind,
          priority: "P2_medium" as const,
          description: `Observed gap: ${kind} (auto-classified)`,
          affected_repos: data.repos,
          affected_categories: data.categories,
          frequency: data.repos.length,
          impact_pct: Math.round((data.repos.length / totalRepos) * 100),
          fix_approach: "Investigate pattern and add to gap taxonomy",
          fix_effort: "medium" as const,
          deferred: false,
        };
      }
      return {
        ...def,
        affected_repos: data.repos,
        affected_categories: data.categories,
        frequency: data.repos.length,
        impact_pct: Math.round((data.repos.length / totalRepos) * 100),
      };
    })
    .sort((a, b) => {
      const pa = PRIORITY_ORDER.indexOf(a.priority);
      const pb = PRIORITY_ORDER.indexOf(b.priority);
      if (pa !== pb) return pa - pb;
      return b.frequency - a.frequency;
    });

  const taxonomy = {
    schema_version: "p28b_gap_taxonomy@0.1.0",
    generated_at: new Date().toISOString(),
    phase: "P28b-1",
    baseline_source: "baseline_raw",
    total_repos: totalRepos,
    gap_count: gaps.length,
    blocker_count: gaps.filter(g => g.priority === "P0_blocker").length,
    high_count: gaps.filter(g => g.priority === "P1_high").length,
    medium_count: gaps.filter(g => g.priority === "P2_medium").length,
    low_count: gaps.filter(g => g.priority === "P3_low").length,
    deferred_count: gaps.filter(g => g.deferred).length,
    active_fix_count: gaps.filter(g => !g.deferred).length,
    gaps,
    summary: {
      crash_count: aggregate.crash_count,
      timeout_count: aggregate.timeout_count,
      sanitizer_violation_repos: aggregate.sanitizer_violation_repos,
      smoke_or_better_pct: aggregate.rates.smoke_or_better,
      supported_or_better_pct: aggregate.rates.supported_or_better,
      support_levels: aggregate.support_levels,
    },
  };

  writeFileSync(join(OUTPUT_DIR, "gap_taxonomy.json"), JSON.stringify(taxonomy, null, 2));

  // Markdown report
  const mdLines = [
    "# P28b-1 Gap Taxonomy",
    "",
    `Generated: ${new Date().toISOString().split("T")[0]} | Repos: ${totalRepos} | Gaps: ${gaps.length}`,
    "",
    "## Summary",
    "",
    `| Level | Count |`,
    `|---|---|`,
    `| P0 Blocker | ${taxonomy.blocker_count} |`,
    `| P1 High | ${taxonomy.high_count} |`,
    `| P2 Medium | ${taxonomy.medium_count} |`,
    `| P3 Low | ${taxonomy.low_count} |`,
    `| **Active fix** | **${taxonomy.active_fix_count}** |`,
    `| Deferred | ${taxonomy.deferred_count} |`,
    "",
    `Smoke+: **${taxonomy.summary.smoke_or_better_pct}%** | Supported+: **${taxonomy.summary.supported_or_better_pct}%**`,
    "",
  ];

  for (const priority of PRIORITY_ORDER) {
    const priorityGaps = gaps.filter(g => g.priority === priority);
    if (priorityGaps.length === 0) continue;

    const label = priority === "P0_blocker" ? "🔴 P0 Blocker" :
      priority === "P1_high" ? "🟠 P1 High" :
      priority === "P2_medium" ? "🟡 P2 Medium" : "⚪ P3 Low";

    mdLines.push(`## ${label}`);
    mdLines.push("");

    for (const gap of priorityGaps) {
      const deferredTag = gap.deferred ? " *(deferred)*" : "";
      mdLines.push(`### ${gap.kind}${deferredTag}`);
      mdLines.push("");
      mdLines.push(`- **Frequency**: ${gap.frequency} repos (${gap.impact_pct}%)`);
      mdLines.push(`- **Categories**: ${gap.affected_categories.join(", ")}`);
      mdLines.push(`- **Description**: ${gap.description}`);
      mdLines.push(`- **Fix approach**: ${gap.fix_approach}`);
      mdLines.push(`- **Effort**: ${gap.fix_effort}`);
      if (gap.deferred) mdLines.push(`- **Defer reason**: ${gap.defer_reason}`);
      mdLines.push(`- **Repos**: ${gap.affected_repos.slice(0, 10).join(", ")}${gap.affected_repos.length > 10 ? `... (+${gap.affected_repos.length - 10})` : ""}`);
      mdLines.push("");
    }
  }

  mdLines.push("---");
  mdLines.push("_Auto-generated by p28b_gap_taxonomy.ts_");

  writeFileSync(join(OUTPUT_DIR, "gap_taxonomy.md"), mdLines.join("\n"));

  // Console output
  log(`\n=== Gap Taxonomy ===`);
  log(`Total repos: ${totalRepos} | Gaps found: ${gaps.length}`);
  log(`P0 Blocker: ${taxonomy.blocker_count} | P1 High: ${taxonomy.high_count} | P2 Medium: ${taxonomy.medium_count} | P3 Low: ${taxonomy.low_count}`);
  log(`Active fixes needed: ${taxonomy.active_fix_count} | Deferred: ${taxonomy.deferred_count}`);
  log("");
  log("Prioritized gap list:");
  for (const g of gaps.filter(g => !g.deferred)) {
    log(`  [${g.priority}] ${g.kind}: ${g.frequency} repos (${g.impact_pct}%) — effort: ${g.fix_effort}`);
  }
  if (gaps.filter(g => g.deferred).length > 0) {
    log("\nDeferred:");
    for (const g of gaps.filter(g => g.deferred)) {
      log(`  [${g.priority}] ${g.kind}: ${g.frequency} repos — ${g.defer_reason}`);
    }
  }
  log(`\nWritten to ${OUTPUT_DIR}/gap_taxonomy.json + gap_taxonomy.md`);
}

main();
