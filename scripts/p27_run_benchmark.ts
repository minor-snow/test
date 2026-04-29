/**
 * P27-0: Benchmark Runner
 *
 * Single monolithic script — no src/benchmark/ abstraction.
 * Reads benchmark_manifest.json, runs pantheon guard/check on each repo,
 * collects observed_baseline_v0.json, generates preflight report.
 *
 * Usage:
 *   npx tsx scripts/p27_run_benchmark.ts [--id <benchmark_id>]
 *
 * Without --id, runs all benchmarks in the manifest.
 */

import { join, resolve, dirname } from "node:path";
import {
  existsSync, mkdirSync, readFileSync, writeFileSync, cpSync, rmSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import * as url from "node:url";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));
const PANTHEON_ROOT = resolve(__dirname, "..");
const BENCHMARKS_DIR = join(PANTHEON_ROOT, "data", "dogfood", "benchmarks");
const MANIFEST_PATH = join(BENCHMARKS_DIR, "benchmark_manifest.json");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BenchmarkScope = {
  readonly allowed: readonly string[];
  readonly review: readonly string[];
  readonly forbid: readonly string[];
};

type BenchmarkEntry = {
  readonly benchmark_id: string;
  readonly category: string;
  readonly local_path: string;
  readonly pinned_commit: string;
  readonly change_intent: string;
  readonly scope: BenchmarkScope;
};

type BenchmarkManifest = {
  readonly schema_version: string;
  readonly benchmarks: readonly BenchmarkEntry[];
};

type ObservedSignalStatus = "observed" | "partial" | "not_available";

type ObservedSignalBlock<T> = {
  readonly status: ObservedSignalStatus;
  readonly count: number;
  readonly items: readonly T[];
};

type ObservedBaseline = {
  readonly schema_version: "observed_baseline@0.1.0";
  readonly benchmark_id: string;
  readonly category: string;
  readonly pinned_commit: string;
  readonly generated_at: string;
  readonly check_mode: "no_diff_baseline";
  readonly layout_signals: ObservedSignalBlock<{ path: string; evidence: string }> & {
    readonly primary_layout?: string;
    readonly package_layout?: string;
    readonly layout_confidence?: string;
    readonly layout_evidence?: readonly { signal: string; weight: string; evidence: string }[];
    readonly layout_unknowns?: readonly { aspect: string; reason: string }[];
  };
  readonly framework_signals: ObservedSignalBlock<{ name: string; kind: string; confidence: string; evidence: readonly { dimension: string; detail: string }[] }>;
  readonly project_role_signals: ObservedSignalBlock<{ role: string; confidence: string; evidence: readonly { dimension: string; detail: string }[] }>;
  readonly dependency_manifests: ObservedSignalBlock<{ source: string; package_count: number; confidence: string }>;
  readonly test_mappings: ObservedSignalBlock<{ source: string; test_count: number; confidence: string }>;
  readonly sensitive_zones: ObservedSignalBlock<{ category: string; severity: string; path_count: number }>;
  readonly unknowns: ObservedSignalBlock<{ category: string; count: number; classification: string }>;
  readonly risk_preset: {
    readonly preset: string;
    readonly validation: string;
    readonly confidence: string;
    readonly matched_signals: readonly string[];
    readonly suggested_review_count: number;
    readonly suggested_forbidden_count: number;
    readonly dormant_count: number;
    readonly suggested_review: readonly { pattern: string; reason: string; severity: string; matched_path_count: number }[];
    readonly suggested_forbidden: readonly { pattern: string; reason: string; severity: string; matched_path_count: number }[];
    readonly dormant_patterns: readonly { pattern: string; reason: string }[];
  };
  readonly quality: Record<string, number | string>;
};

type BenchmarkResult = {
  readonly benchmark_id: string;
  readonly category: string;
  readonly status: "success" | "failed";
  readonly error?: string;
  readonly baseline_path?: string;
  readonly guard_verdict?: string;
  readonly check_verdict?: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(msg: string) { console.log(`[P27] ${msg}`); }
function die(msg: string): never { console.error(`[P27 FATAL] ${msg}`); process.exit(1); }

function runGit(args: string[], cwd: string): string {
  const r = spawnSync("git", args, { cwd, encoding: "utf-8" });
  if (r.error) die(`git ${args.join(" ")} error: ${r.error.message}`);
  if (r.status !== 0) die(`git ${args.join(" ")} failed:\n${r.stderr}`);
  return r.stdout.trim();
}

function runPantheon(args: string[], cwd: string, allowNonZero = false): { stdout: string; stderr: string; status: number } {
  const pantheonPath = join(PANTHEON_ROOT, "src", "cli", "pantheon.ts");
  const r = spawnSync("npx", ["tsx", pantheonPath, ...args], { cwd, encoding: "utf-8", shell: true });
  if (r.error) die(`pantheon ${args[0]} error: ${r.error.message}`);
  if (!allowNonZero && r.status !== 0) die(`pantheon ${args.join(" ")} failed:\n${r.stderr}\n${r.stdout}`);
  return { stdout: r.stdout?.trim() ?? "", stderr: r.stderr?.trim() ?? "", status: r.status ?? 0 };
}

// ---------------------------------------------------------------------------
// Worktree management
// ---------------------------------------------------------------------------

function createWorktree(repoPath: string, worktreeDir: string, commit: string) {
  if (existsSync(worktreeDir)) {
    log(`Removing existing worktree at ${worktreeDir}...`);
    spawnSync("git", ["worktree", "remove", "--force", worktreeDir], { cwd: repoPath });
    if (existsSync(worktreeDir)) rmSync(worktreeDir, { recursive: true, force: true });
  }
  log(`Creating worktree at ${worktreeDir} (commit ${commit.slice(0, 12)})...`);
  runGit(["worktree", "add", worktreeDir, commit], repoPath);
}

function cleanupWorktree(repoPath: string, worktreeDir: string) {
  log(`Cleaning up worktree...`);
  const r = spawnSync("git", ["worktree", "remove", "--force", worktreeDir], { cwd: repoPath });
  if (r.status === 0) {
    log("✅ Worktree cleanup succeeded");
  } else {
    console.error(`⚠️ Worktree cleanup failed: ${r.stderr}`);
  }
}

// ---------------------------------------------------------------------------
// Baseline extraction
// ---------------------------------------------------------------------------

function extractObservedBaseline(entry: BenchmarkEntry, worktreeDir: string): ObservedBaseline {
  // Read Python observation sidecar if it exists
  const pyObsPath = join(worktreeDir, ".pantheon", "internal", "python_observations.json");
  const hasPyObs = existsSync(pyObsPath);
  const pyObs = hasPyObs ? JSON.parse(readFileSync(pyObsPath, "utf-8")) : null;

  // Layout signals — derived from file classification buckets + P27-1b layout classifier
  const layoutSignals: ObservedBaseline["layout_signals"] = (() => {
    if (!pyObs?.files) return { status: "not_available" as const, count: 0, items: [] };
    const buckets = new Map<string, number>();
    for (const f of pyObs.files) {
      buckets.set(f.bucket, (buckets.get(f.bucket) ?? 0) + 1);
    }
    const items = [...buckets.entries()].map(([path, count]) => ({
      path: `bucket:${path}`,
      evidence: `${count} files`,
    }));

    // Include P27-1b layout classification if available
    const layout = pyObs.layout;
    return {
      status: "observed" as const,
      count: items.length,
      items,
      ...(layout ? {
        primary_layout: layout.primary_layout,
        package_layout: layout.package_layout,
        layout_confidence: layout.confidence,
        layout_evidence: layout.signals,
        layout_unknowns: layout.unknowns.length > 0 ? layout.unknowns : undefined,
      } : {}),
    };
  })();

  // Framework signals — from P27-1c framework detector (replaces ad-hoc heuristic)
  const frameworkSignals: ObservedBaseline["framework_signals"] = (() => {
    const profile = pyObs?.framework_profile;
    if (!profile?.framework_signals) return { status: "not_available" as const, count: 0, items: [] };
    const items = profile.framework_signals.map((f: any) => ({
      name: f.name,
      kind: f.kind,
      confidence: f.confidence,
      evidence: f.evidence,
    }));
    return {
      status: items.length > 0 ? "observed" as const : "not_available" as const,
      count: items.length,
      items,
    };
  })();

  // Project role signals — from P27-1c framework detector
  const projectRoleSignals: ObservedBaseline["project_role_signals"] = (() => {
    const profile = pyObs?.framework_profile;
    if (!profile?.project_role_signals) return { status: "not_available" as const, count: 0, items: [] };
    const items = profile.project_role_signals.map((r: any) => ({
      role: r.role,
      confidence: r.confidence,
      evidence: r.evidence,
    }));
    return {
      status: items.length > 0 ? "observed" as const : "not_available" as const,
      count: items.length,
      items,
    };
  })();

  // Dependency manifests
  const depManifests: ObservedBaseline["dependency_manifests"] = (() => {
    if (!pyObs?.dependency_manifests) return { status: "not_available" as const, count: 0, items: [] };
    const items = pyObs.dependency_manifests.map((m: any) => ({
      source: m.source_path,
      package_count: m.packages.length + m.dev_packages.length,
      confidence: m.confidence,
    }));
    return { status: "observed" as const, count: items.length, items };
  })();

  // Test mappings
  const testMappings: ObservedBaseline["test_mappings"] = (() => {
    if (!pyObs?.test_mappings) return { status: "not_available" as const, count: 0, items: [] };
    const items = pyObs.test_mappings
      .filter((t: any) => t.existing_test_paths.length > 0)
      .slice(0, 20) // cap for readability
      .map((t: any) => ({
        source: t.source_path,
        test_count: t.existing_test_paths.length,
        confidence: t.confidence,
      }));
    return {
      status: pyObs.test_mappings.length > 0 ? "observed" as const : "not_available" as const,
      count: pyObs.test_mappings.length,
      items,
    };
  })();

  // Sensitive zones
  const sensitiveZones: ObservedBaseline["sensitive_zones"] = (() => {
    if (!pyObs?.sensitive_zones) return { status: "not_available" as const, count: 0, items: [] };
    const items = pyObs.sensitive_zones.map((z: any) => ({
      category: z.category,
      severity: z.severity,
      path_count: z.matched_paths.length,
    }));
    return { status: "observed" as const, count: items.length, items };
  })();

  // Unknowns
  const unknowns: ObservedBaseline["unknowns"] = (() => {
    if (!pyObs?.unknowns) return { status: "not_available" as const, count: 0, items: [] };
    const items = pyObs.unknowns.map((u: any) => ({
      category: u.category,
      count: u.count,
      classification: u.classification,
    }));
    const totalCount = items.reduce((sum: number, u: any) => sum + u.count, 0);
    return { status: "observed" as const, count: totalCount, items };
  })();

  // Risk preset validation (P27-1e)
  const riskPreset: ObservedBaseline["risk_preset"] = (() => {
    const rpv = pyObs?.risk_preset_validation;
    if (!rpv) return {
      preset: "unknown", validation: "unvalidated", confidence: "low",
      matched_signals: [], suggested_review_count: 0, suggested_forbidden_count: 0,
      dormant_count: 0, suggested_review: [], suggested_forbidden: [], dormant_patterns: [],
    };
    return {
      preset: rpv.preset,
      validation: rpv.validation,
      confidence: rpv.confidence,
      matched_signals: rpv.matched_signals,
      suggested_review_count: rpv.suggested_review?.length ?? 0,
      suggested_forbidden_count: rpv.suggested_forbidden?.length ?? 0,
      dormant_count: rpv.dormant_patterns?.length ?? 0,
      suggested_review: (rpv.suggested_review ?? []).map((s: any) => ({
        pattern: s.pattern, reason: s.reason, severity: s.severity,
        matched_path_count: s.matched_path_count,
      })),
      suggested_forbidden: (rpv.suggested_forbidden ?? []).map((s: any) => ({
        pattern: s.pattern, reason: s.reason, severity: s.severity,
        matched_path_count: s.matched_path_count,
      })),
      dormant_patterns: rpv.dormant_patterns ?? [],
    };
  })();

  // Quality
  const quality: Record<string, number | string> = pyObs?.quality ?? {};

  return {
    schema_version: "observed_baseline@0.1.0",
    benchmark_id: entry.benchmark_id,
    category: entry.category,
    pinned_commit: entry.pinned_commit,
    generated_at: new Date().toISOString(),
    check_mode: "no_diff_baseline",
    layout_signals: layoutSignals,
    framework_signals: frameworkSignals,
    project_role_signals: projectRoleSignals,
    dependency_manifests: depManifests,
    test_mappings: testMappings,
    sensitive_zones: sensitiveZones,
    unknowns,
    risk_preset: riskPreset,
    quality,
  };
}

// ---------------------------------------------------------------------------
// Single benchmark runner
// ---------------------------------------------------------------------------

function runBenchmark(entry: BenchmarkEntry): BenchmarkResult {
  const benchDir = join(BENCHMARKS_DIR, entry.benchmark_id);
  // Short worktree path to avoid Windows MAX_PATH
  const worktreeDir = join(BENCHMARKS_DIR, `wt_${entry.benchmark_id.slice(0, 8)}`);
  mkdirSync(benchDir, { recursive: true });

  log(`\n${"=".repeat(60)}`);
  log(`Benchmark: ${entry.benchmark_id} (${entry.category})`);
  log(`${"=".repeat(60)}`);

  // Validate repo
  if (!existsSync(entry.local_path)) {
    return { benchmark_id: entry.benchmark_id, category: entry.category, status: "failed", error: `Repo not found: ${entry.local_path}` };
  }
  if (!existsSync(join(entry.local_path, ".git"))) {
    return { benchmark_id: entry.benchmark_id, category: entry.category, status: "failed", error: `Not a git repo: ${entry.local_path}` };
  }

  // Validate pinned commit
  try {
    runGit(["cat-file", "-t", entry.pinned_commit], entry.local_path);
  } catch {
    return { benchmark_id: entry.benchmark_id, category: entry.category, status: "failed", error: `Pinned commit not found: ${entry.pinned_commit}` };
  }

  // Create worktree
  createWorktree(entry.local_path, worktreeDir, entry.pinned_commit);

  // Build guard args
  const guardArgs = [
    "guard",
    entry.change_intent,
    ...entry.scope.allowed.flatMap(p => ["--scope", p]),
    ...entry.scope.review.flatMap(p => ["--review", p]),
    ...entry.scope.forbid.flatMap(p => ["--forbid", p]),
  ];

  // Run guard
  log("Running pantheon guard...");
  const guardResult = runPantheon(guardArgs, worktreeDir, true);
  log(`Guard exit: ${guardResult.status}`);

  // Run check (no-diff baseline)
  log("Running pantheon check (no-diff baseline)...");
  const checkResult = runPantheon(["check"], worktreeDir, true);
  const checkVerdict = checkResult.stdout.includes("no changed files detected")
    ? "pass_no_diff"
    : "checked";
  log(`Check result: ${checkVerdict}`);

  // Extract observed baseline
  log("Extracting observed baseline...");
  const baseline = extractObservedBaseline(entry, worktreeDir);
  const baselinePath = join(benchDir, "observed_baseline_v0.json");
  writeFileSync(baselinePath, JSON.stringify(baseline, null, 2));
  log(`✅ Baseline written: ${baselinePath}`);

  // Copy public artifacts
  const publicFiles = ["task.md", "scope.md", "check.json", "report.md", "feedback.md", "python_report.md"];
  for (const f of publicFiles) {
    const src = join(worktreeDir, ".pantheon", f);
    if (existsSync(src)) {
      cpSync(src, join(benchDir, f));
    }
  }

  // Also copy python_observations.json for internal reference
  const pyObsSrc = join(worktreeDir, ".pantheon", "internal", "python_observations.json");
  if (existsSync(pyObsSrc)) {
    cpSync(pyObsSrc, join(benchDir, "python_observations.json"));
  }

  // Cleanup
  cleanupWorktree(entry.local_path, worktreeDir);

  return {
    benchmark_id: entry.benchmark_id,
    category: entry.category,
    status: "success",
    baseline_path: baselinePath,
    guard_verdict: `exit_${guardResult.status}`,
    check_verdict: checkVerdict,
  };
}

// ---------------------------------------------------------------------------
// Report generation
// ---------------------------------------------------------------------------

function generatePreflightReport(results: BenchmarkResult[]): string {
  const lines: string[] = [];
  lines.push("# P27-0 Preflight Report");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push("| Benchmark | Category | Status | Check Mode |");
  lines.push("|---|---|---|---|");
  for (const r of results) {
    lines.push(`| ${r.benchmark_id} | ${r.category} | ${r.status === "success" ? "✅" : "❌"} ${r.status} | no_diff_baseline |`);
  }
  lines.push("");

  lines.push("> **Note**: P27-0 check is baseline/no-diff verification only. Boundary enforcement synthetic cases are deferred to P27-1+.");
  lines.push("");

  for (const r of results) {
    lines.push(`## ${r.benchmark_id}`);
    lines.push("");
    if (r.status === "failed") {
      lines.push(`**Error**: ${r.error}`);
      lines.push("");
      continue;
    }

    // Load baseline for report details
    const baselinePath = join(BENCHMARKS_DIR, r.benchmark_id, "observed_baseline_v0.json");
    if (!existsSync(baselinePath)) {
      lines.push("Baseline not available.");
      lines.push("");
      continue;
    }

    const baseline: ObservedBaseline = JSON.parse(readFileSync(baselinePath, "utf-8"));

    lines.push(`- **Category**: ${baseline.category}`);
    lines.push(`- **Pinned commit**: \`${baseline.pinned_commit.slice(0, 12)}\``);
    lines.push(`- **Check mode**: ${baseline.check_mode}`);
    lines.push("");

    lines.push("### Observation Signals");
    lines.push("");
    lines.push("| Signal | Status | Count |");
    lines.push("|---|---|---:|");
    lines.push(`| Layout signals | ${baseline.layout_signals.status} | ${baseline.layout_signals.count} |`);
    lines.push(`| Framework signals | ${baseline.framework_signals.status} | ${baseline.framework_signals.count} |`);
    lines.push(`| Project role signals | ${baseline.project_role_signals.status} | ${baseline.project_role_signals.count} |`);
    lines.push(`| Dependency manifests | ${baseline.dependency_manifests.status} | ${baseline.dependency_manifests.count} |`);
    lines.push(`| Test mappings | ${baseline.test_mappings.status} | ${baseline.test_mappings.count} |`);
    lines.push(`| Sensitive zones | ${baseline.sensitive_zones.status} | ${baseline.sensitive_zones.count} |`);
    lines.push(`| Unknowns | ${baseline.unknowns.status} | ${baseline.unknowns.count} |`);
    lines.push("");

    // Layout classification (P27-1b)
    if (baseline.layout_signals.primary_layout) {
      lines.push("### Layout Classification");
      lines.push("");
      lines.push(`- **Primary layout**: ${baseline.layout_signals.primary_layout}`);
      lines.push(`- **Package layout**: ${baseline.layout_signals.package_layout}`);
      lines.push(`- **Confidence**: ${baseline.layout_signals.layout_confidence}`);
      if (baseline.layout_signals.layout_evidence && baseline.layout_signals.layout_evidence.length > 0) {
        lines.push("");
        lines.push("**Signals**:");
        for (const sig of baseline.layout_signals.layout_evidence) {
          lines.push(`- \`${sig.signal}\` (${sig.weight}): ${sig.evidence}`);
        }
      }
      if (baseline.layout_signals.layout_unknowns && baseline.layout_signals.layout_unknowns.length > 0) {
        lines.push("");
        lines.push("**Layout unknowns**:");
        for (const u of baseline.layout_signals.layout_unknowns) {
          lines.push(`- ${u.aspect}: ${u.reason}`);
        }
      }
      lines.push("");
    }
    lines.push("");

    if (baseline.framework_signals.items.length > 0) {
      lines.push("### Detected Frameworks");
      lines.push("");
      for (const fw of baseline.framework_signals.items) {
        const evidenceStrs = fw.evidence.map((e: any) => `[${e.dimension}] ${e.detail}`);
        lines.push(`- **${fw.name}** (${fw.kind}, ${fw.confidence}): ${evidenceStrs.join("; ")}`);
      }
      lines.push("");
    }

    if (baseline.project_role_signals.items.length > 0) {
      lines.push("### Project Roles");
      lines.push("");
      for (const role of baseline.project_role_signals.items) {
        const evidenceStrs = role.evidence.map((e: any) => `[${e.dimension}] ${e.detail}`);
        lines.push(`- **${role.role}** (${role.confidence}): ${evidenceStrs.join("; ")}`);
      }
      lines.push("");
    }

    if (baseline.dependency_manifests.items.length > 0) {
      lines.push("### Dependency Manifests");
      lines.push("");
      for (const m of baseline.dependency_manifests.items) {
        lines.push(`- \`${m.source}\`: ${m.package_count} packages (${m.confidence})`);
      }
      lines.push("");
    }

    if (baseline.sensitive_zones.items.length > 0) {
      lines.push("### Sensitive Zones");
      lines.push("");
      for (const z of baseline.sensitive_zones.items) {
        lines.push(`- **${z.category}** (${z.severity}): ${z.path_count} paths`);
      }
      lines.push("");
    }

    // Risk preset validation (P27-1e)
    if (baseline.risk_preset.preset !== "unknown") {
      lines.push("### Risk Preset Validation");
      lines.push("");
      lines.push(`- **Preset**: ${baseline.risk_preset.preset}`);
      lines.push(`- **Validation**: ${baseline.risk_preset.validation}`);
      lines.push(`- **Confidence**: ${baseline.risk_preset.confidence}`);
      lines.push(`- **Review candidates**: ${baseline.risk_preset.suggested_review_count}`);
      lines.push(`- **Forbidden candidates**: ${baseline.risk_preset.suggested_forbidden_count}`);
      lines.push(`- **Dormant patterns**: ${baseline.risk_preset.dormant_count}`);

      if (baseline.risk_preset.suggested_forbidden.length > 0) {
        lines.push("");
        lines.push("**Suggested forbidden** (AI agents should NOT modify):");
        for (const s of baseline.risk_preset.suggested_forbidden) {
          lines.push(`- \`${s.pattern}\` (${s.severity}): ${s.reason} — ${s.matched_path_count} paths`);
        }
      }

      if (baseline.risk_preset.suggested_review.length > 0) {
        lines.push("");
        lines.push("**Suggested review-required** (human review before merge):");
        for (const s of baseline.risk_preset.suggested_review) {
          lines.push(`- \`${s.pattern}\` (${s.severity}): ${s.reason} — ${s.matched_path_count} paths`);
        }
      }

      if (baseline.risk_preset.dormant_patterns.length > 0) {
        lines.push("");
        lines.push("**Dormant patterns** (expected but not observed):");
        for (const d of baseline.risk_preset.dormant_patterns) {
          lines.push(`- \`${d.pattern}\`: ${d.reason}`);
        }
      }
      lines.push("");
    }

    // Quality summary
    if (Object.keys(baseline.quality).length > 0) {
      lines.push("### Quality Metrics");
      lines.push("");
      const q = baseline.quality;
      if (q.python_file_count !== undefined) lines.push(`- Python files: ${q.python_file_count}`);
      if (q.classified_ratio !== undefined) lines.push(`- Classified ratio: ${(Number(q.classified_ratio) * 100).toFixed(1)}%`);
      if (q.unknown_count !== undefined) lines.push(`- Unknowns: ${q.unknown_count}`);
      if (q.import_observation_count !== undefined) lines.push(`- Import observations: ${q.import_observation_count}`);
      if (q.test_mapping_count !== undefined) lines.push(`- Test mappings: ${q.test_mapping_count}`);
      if (q.sensitive_zone_count !== undefined) lines.push(`- Sensitive zones: ${q.sensitive_zone_count}`);
      if (q.manifest_count !== undefined) lines.push(`- Manifests: ${q.manifest_count}`);
      lines.push("");
    }
  }

  lines.push("---");
  lines.push("_Auto-generated by P27-0 benchmark runner._");

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  log("Starting P27-0 Benchmark Runner");

  if (!existsSync(MANIFEST_PATH)) {
    die(`Manifest not found: ${MANIFEST_PATH}`);
  }

  const manifest: BenchmarkManifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf-8"));
  log(`Loaded manifest: ${manifest.benchmarks.length} benchmark(s)`);

  // Parse --id filter
  const idFilter = process.argv.includes("--id")
    ? process.argv[process.argv.indexOf("--id") + 1]
    : null;

  const entriesToRun = idFilter
    ? manifest.benchmarks.filter(b => b.benchmark_id === idFilter)
    : [...manifest.benchmarks];

  if (entriesToRun.length === 0) {
    die(idFilter ? `Benchmark not found: ${idFilter}` : "No benchmarks in manifest");
  }

  log(`Running ${entriesToRun.length} benchmark(s)${idFilter ? ` (filtered: ${idFilter})` : ""}...`);

  const results: BenchmarkResult[] = [];
  for (const entry of entriesToRun) {
    try {
      results.push(runBenchmark(entry));
    } catch (err) {
      results.push({
        benchmark_id: entry.benchmark_id,
        category: entry.category,
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Generate report
  const report = generatePreflightReport(results);
  writeFileSync(join(BENCHMARKS_DIR, "p27_preflight_report.md"), report);
  log(`✅ Preflight report written`);

  // Summary JSON
  writeFileSync(join(BENCHMARKS_DIR, "p27_preflight_summary.json"), JSON.stringify({
    generated_at: new Date().toISOString(),
    results,
  }, null, 2));

  // Final summary
  const passed = results.filter(r => r.status === "success").length;
  const failed = results.filter(r => r.status === "failed").length;
  log(`\n🎯 P27-0 complete: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main();
