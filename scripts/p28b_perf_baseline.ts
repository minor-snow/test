#!/usr/bin/env tsx
/**
 * P28b-0 Performance Baseline Runner
 *
 * Runs Core 3 + Extended 5 repos through pantheon guard (observation only mode)
 * and records actual wall-clock timing to establish the P28b performance budget.
 *
 * Uses the same spawnSync + pantheon CLI approach as p27_run_benchmark.ts.
 *
 * Usage:
 *   npx tsx scripts/p28b_perf_baseline.ts
 *   npx tsx scripts/p28b_perf_baseline.ts --id saleor-django-commerce
 */

import { join, resolve, dirname } from "node:path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import * as url from "node:url";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));
const PANTHEON_ROOT = resolve(__dirname, "..");
const MANIFEST_PATH = join(PANTHEON_ROOT, "data", "dogfood", "p28b_python_matrix", "manifest.json");
const OUTPUT_DIR = join(PANTHEON_ROOT, "data", "dogfood", "p28b_python_matrix");

function log(msg: string) { console.log(`[P28b-perf] ${msg}`); }

interface ManifestRepo {
  repo_id: string;
  source: string;
  category: string;
  local_path: string | null;
  github_url: string | null;
  pinned_commit: string | null;
  expected_min_support: string;
  notes: string;
  preflight_status: string;
}

interface PerfResult {
  repo_id: string;
  category: string;
  local_path: string;
  guard_total_ms: number;
  python_obs_available: boolean;
  python_file_count: number | null;
  timeout: boolean;
  exit_code: number;
  notes: string;
}

function runPantheonGuard(repoPath: string, repoId: string): {
  ms: number;
  exit_code: number;
  timeout: boolean;
  pythonObsPath: string;
} {
  const pantheonPath = join(PANTHEON_ROOT, "src", "cli", "pantheon.ts");
  const TIMEOUT_MS = 120_000; // 2 minute budget

  const start = Date.now();
  const r = spawnSync(
    "npx",
    ["tsx", pantheonPath, "guard", `Perf baseline scan for ${repoId}`, "--scope", "**/*.py"],
    {
      cwd: repoPath,
      encoding: "utf-8",
      shell: true,
      timeout: TIMEOUT_MS,
    }
  );
  const ms = Date.now() - start;
  const timeout = r.signal === "SIGTERM" || ms >= TIMEOUT_MS - 100;

  return {
    ms,
    exit_code: r.status ?? -1,
    timeout,
    pythonObsPath: join(repoPath, ".pantheon", "internal", "python_observations.json"),
  };
}

function readPythonFileCount(pythonObsPath: string): number | null {
  if (!existsSync(pythonObsPath)) return null;
  try {
    const obs = JSON.parse(readFileSync(pythonObsPath, "utf-8"));
    return obs?.quality?.python_file_count ?? obs?.files?.filter((f: any) => f.path?.endsWith(".py")).length ?? null;
  } catch {
    return null;
  }
}

function main() {
  log("P28b-0 Performance Baseline");
  log(`Manifest: ${MANIFEST_PATH}`);

  if (!existsSync(MANIFEST_PATH)) {
    console.error(`Manifest not found: ${MANIFEST_PATH}`);
    process.exit(1);
  }

  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf-8"));
  const repos: ManifestRepo[] = manifest.repos.filter(
    (r: ManifestRepo) => r.source === "source_b" && r.local_path
  );

  // Optional --id filter
  const idFilter = process.argv.includes("--id")
    ? process.argv[process.argv.indexOf("--id") + 1]
    : null;

  const toRun = idFilter ? repos.filter(r => r.repo_id === idFilter) : repos;

  if (toRun.length === 0) {
    console.error("No repos to run.");
    process.exit(1);
  }

  log(`Running ${toRun.length} repos (Core 3 + Extended 5)...\n`);

  const results: PerfResult[] = [];

  for (const repo of toRun) {
    if (!repo.local_path || !existsSync(repo.local_path)) {
      log(`  [SKIP] ${repo.repo_id}: path not found (${repo.local_path})`);
      continue;
    }

    log(`  [RUN] ${repo.repo_id} (${repo.category})...`);
    const { ms, exit_code, timeout, pythonObsPath } = runPantheonGuard(repo.local_path, repo.repo_id);
    const pythonFileCount = readPythonFileCount(pythonObsPath);

    const result: PerfResult = {
      repo_id: repo.repo_id,
      category: repo.category,
      local_path: repo.local_path,
      guard_total_ms: ms,
      python_obs_available: existsSync(pythonObsPath),
      python_file_count: pythonFileCount,
      timeout,
      exit_code,
      notes: timeout
        ? "exceeded 2 minute budget"
        : exit_code !== 0
        ? `exit_code=${exit_code}`
        : "ok",
    };
    results.push(result);

    const icon = timeout ? "⏰" : exit_code === 0 ? "✅" : "⚠️";
    log(`  ${icon} ${ms}ms | py_files=${pythonFileCount ?? "n/a"} | ${result.notes}`);
  }

  // Compute budget
  const completedMs = results.filter(r => !r.timeout).map(r => r.guard_total_ms).sort((a, b) => a - b);
  const p50 = completedMs[Math.floor(completedMs.length * 0.5)] ?? 0;
  const p95 = completedMs[Math.floor(completedMs.length * 0.95)] ?? completedMs[completedMs.length - 1] ?? 0;

  // Category-aware budget
  const smallMediumMs = results
    .filter(r => !r.timeout && (r.python_file_count ?? 0) < 200)
    .map(r => r.guard_total_ms);
  const largeMs = results
    .filter(r => !r.timeout && (r.python_file_count ?? 0) >= 200)
    .map(r => r.guard_total_ms);

  const smallP95 = smallMediumMs.sort((a, b) => a - b)[Math.floor(smallMediumMs.length * 0.95)] ?? p95;
  const largeP95 = largeMs.sort((a, b) => a - b)[Math.floor(largeMs.length * 0.95)] ?? p95;

  const baseline = {
    schema_version: "p28b_perf_baseline@0.1.0",
    generated_at: new Date().toISOString(),
    phase: "P28b-0",
    description: "Core 3 + Extended 5 wall-clock timing via pantheon guard",
    repos: results,
    summary: {
      repo_count: results.length,
      completed_count: results.filter(r => !r.timeout).length,
      timeout_count: results.filter(r => r.timeout).length,
      p50_ms: p50,
      p95_ms: p95,
    },
    budget: {
      small_medium_repo_p95_ms: smallP95,
      large_repo_p95_ms: largeP95,
      monorepo_policy: "timeout_allowed -> observed_only",
      hard_timeout_ms: 120_000,
      recommendation: p95 <= 30_000
        ? "Budget confirmed: p95 < 30s for standard repos"
        : p95 <= 60_000
        ? "Budget adjusted: p95 < 60s for large repos"
        : "Budget exceeded: investigate performance regression",
      category_aware: {
        "small_medium (<200 py files)": `p95 < ${Math.max(30_000, smallP95)}ms`,
        "large (>=200 py files)": `p95 < ${Math.max(60_000, largeP95)}ms`,
        monorepo: "timeout -> observed_only (allowed)",
      },
    },
    scanner_interface_note: "repoScanner public interface frozen after P28b-0. Changes to scanner core require restarting baseline.",
  };

  const baselinePath = join(OUTPUT_DIR, "perf_baseline.json");
  writeFileSync(baselinePath, JSON.stringify(baseline, null, 2));

  // Markdown report
  const mdLines = [
    "# P28b-0 Performance Baseline Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Summary",
    "",
    `| Repo | Category | Time (ms) | Py Files | Status |`,
    `|---|---|---:|---:|---|`,
    ...results.map(r =>
      `| ${r.repo_id} | ${r.category} | ${r.guard_total_ms} | ${r.python_file_count ?? "n/a"} | ${r.timeout ? "⏰ timeout" : r.exit_code === 0 ? "✅" : `⚠️ exit ${r.exit_code}`} |`
    ),
    "",
    "## Budget",
    "",
    `- **p50**: ${p50}ms`,
    `- **p95**: ${p95}ms`,
    `- **Timeouts**: ${results.filter(r => r.timeout).length}`,
    "",
    `### Category-Aware Budget`,
    `- Small/medium repos (<200 py files): p95 < ${Math.max(30_000, smallP95)}ms`,
    `- Large repos (≥200 py files): p95 < ${Math.max(60_000, largeP95)}ms`,
    `- Monorepo: timeout → \`observed_only\` allowed`,
    "",
    `### Recommendation`,
    `${baseline.budget.recommendation}`,
    "",
    "## Scanner Interface Freeze",
    "",
    "> After P28b-0, the `repoScanner` public interface is frozen.",
    "> Changes to scanner core require restarting the baseline sweep.",
    "> Subsequent stages (P28b-1+) may only modify Python adapters, classifiers, and mappers.",
    "",
    "---",
    "_Auto-generated by p28b_perf_baseline.ts_",
  ];

  writeFileSync(join(OUTPUT_DIR, "perf_baseline_report.md"), mdLines.join("\n"));

  log(`\n✅ Baseline written to data/dogfood/p28b_python_matrix/`);
  log(`   p50=${p50}ms | p95=${p95}ms | timeouts=${results.filter(r => r.timeout).length}`);
  log(`   ${baseline.budget.recommendation}`);
}

main();
