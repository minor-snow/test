#!/usr/bin/env tsx
/**
 * P28b-1 Step 2: Raw Baseline Scan
 *
 * Runs all "ready" repos through pantheon guard (observation only)
 * and saves raw results to data/dogfood/p28b_python_matrix/baseline_raw/
 *
 * Reads python_observations.json from .pantheon/internal/ after each guard run.
 * Does NOT modify any Python adapters — this is the "before fix" snapshot.
 *
 * Usage:
 *   npx tsx scripts/p28b_baseline_raw.ts
 *   npx tsx scripts/p28b_baseline_raw.ts --id requests
 *   npx tsx scripts/p28b_baseline_raw.ts --skip-existing  (skip repos already in baseline_raw/)
 */

import { join, resolve, dirname } from "node:path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import * as url from "node:url";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));
const PANTHEON_ROOT = resolve(__dirname, "..");
const MANIFEST_PATH = join(PANTHEON_ROOT, "data", "dogfood", "p28b_python_matrix", "manifest.json");
const BASELINE_RAW_DIR = join(PANTHEON_ROOT, "data", "dogfood", "p28b_python_matrix", "baseline_raw");
const PANTHEON_CLI = join(PANTHEON_ROOT, "src", "cli", "pantheon.ts");
const TIMEOUT_MS = 120_000;

const ID_FILTER = process.argv.includes("--id")
  ? process.argv[process.argv.indexOf("--id") + 1]
  : null;
const SKIP_EXISTING = process.argv.includes("--skip-existing");

function log(msg: string) { console.log(`[P28b-raw] ${msg}`); }

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

interface RawBaselineResult {
  repo_id: string;
  category: string;
  local_path: string;
  pinned_commit: string | null;
  expected_min_support: string;
  scan_ms: number;
  timeout: boolean;
  exit_code: number;
  python_obs_path: string;
  python_obs_available: boolean;
  python_obs: any;
  support_assessment: SupportAssessment;
  sanitizer: SanitizerResult;
  notes: string;
}

interface SupportAssessment {
  support_level: "validated" | "supported" | "smoke" | "observed_only" | "unsupported";
  reason: string;
  meets_expected: boolean;
  signals: {
    has_layout: boolean;
    has_framework: boolean;
    has_project_role: boolean;
    has_test_mapping: boolean;
    has_risk_preset: boolean;
    python_file_count: number;
    crash: boolean;
    sanitizer_clean: boolean;
  };
  gaps: string[];
}

interface SanitizerResult {
  violations: number;
  details: string[];
  clean: boolean;
}

const SUPPORT_ORDER = ["unsupported", "observed_only", "smoke", "supported", "validated"];
function supportRank(level: string): number { return SUPPORT_ORDER.indexOf(level); }

function assessSupportLevel(pyObs: any, crash: boolean, timeout: boolean, sanitizerClean: boolean): SupportAssessment {
  const gaps: string[] = [];

  if (crash) {
    return {
      support_level: "unsupported", reason: "Unhandled crash during observation",
      meets_expected: false,
      signals: { has_layout: false, has_framework: false, has_project_role: false, has_test_mapping: false, has_risk_preset: false, python_file_count: 0, crash: true, sanitizer_clean: sanitizerClean },
      gaps: ["crash"],
    };
  }
  if (!sanitizerClean) {
    return {
      support_level: "unsupported", reason: "Sanitizer violation: public artifact path leak",
      meets_expected: false,
      signals: { has_layout: false, has_framework: false, has_project_role: false, has_test_mapping: false, has_risk_preset: false, python_file_count: pyObs?.quality?.python_file_count ?? 0, crash: false, sanitizer_clean: false },
      gaps: ["sanitizer_violation"],
    };
  }
  if (timeout && !pyObs) {
    return {
      support_level: "observed_only", reason: "Timeout — conservative observed_only",
      meets_expected: false,
      signals: { has_layout: false, has_framework: false, has_project_role: false, has_test_mapping: false, has_risk_preset: false, python_file_count: 0, crash: false, sanitizer_clean: true },
      gaps: ["timeout"],
    };
  }

  const layout = pyObs?.layout;
  const hasLayout = !!(layout?.primary_layout && layout?.confidence !== "none" && layout?.confidence !== "low");
  const frameworks = pyObs?.framework_profile?.framework_signals ?? [];
  const hasFramework = frameworks.some((f: any) => f.confidence === "high" || f.confidence === "medium");
  const roles = pyObs?.framework_profile?.project_role_signals ?? [];
  const hasProjectRole = roles.length > 0;
  const testMappings = pyObs?.test_mappings ?? [];
  const hasTestMapping = testMappings.some((t: any) => t.existing_test_paths?.length > 0);
  const rp = pyObs?.risk_preset_validation;
  const hasRiskPreset = !!(rp && rp.preset !== "unknown" && rp.validation !== "unvalidated");
  const pythonFileCount = pyObs?.quality?.python_file_count ?? 0;

  if (!hasLayout) gaps.push("layout_classification_gap");
  if (!hasFramework) gaps.push("framework_detection_gap");
  if (!hasProjectRole) gaps.push("project_role_gap");
  if (!hasTestMapping) gaps.push("test_mapping_gap");
  if (!hasRiskPreset) gaps.push("risk_preset_gap");

  const strongCount = [hasLayout, hasFramework, hasProjectRole, hasTestMapping, hasRiskPreset].filter(Boolean).length;

  let support_level: SupportAssessment["support_level"];
  let reason: string;

  if (strongCount === 5 && pythonFileCount > 0) {
    support_level = "validated";
    reason = "All 5 observation signals present";
  } else if (strongCount >= 3 && hasProjectRole) {
    support_level = "supported";
    reason = `${strongCount}/5 signals including project_role`;
  } else if (pythonFileCount > 0) {
    support_level = "smoke";
    reason = `Basic observation: ${strongCount}/5 signals`;
  } else {
    support_level = "observed_only";
    reason = "Conservative: no strong classification signals";
  }

  return {
    support_level,
    reason,
    meets_expected: false, // will be set per-repo
    signals: { has_layout: hasLayout, has_framework: hasFramework, has_project_role: hasProjectRole, has_test_mapping: hasTestMapping, has_risk_preset: hasRiskPreset, python_file_count: pythonFileCount, crash: false, sanitizer_clean: true },
    gaps,
  };
}

function checkSanitizer(repoPath: string, pyObs: any): SanitizerResult {
  // Sanitizer checks PUBLIC Pantheon artifacts for path leaks.
  // We do NOT scan python_observations.json because it contains import strings and
  // string literals extracted from repo source code (which may legitimately contain
  // paths like "/home/events/" in Wagtail CMS tests, for example).
  //
  // Public artifacts to check: task.md, scope.md, report.md, check.json, feedback.md
  const pantheonDir = join(repoPath, ".pantheon");
  const publicArtifacts = ["task.md", "scope.md", "report.md", "check.json", "feedback.md"];
  const details: string[] = [];

  for (const artifact of publicArtifacts) {
    const artifactPath = join(pantheonDir, artifact);
    if (!existsSync(artifactPath)) continue;

    let text: string;
    try { text = readFileSync(artifactPath, "utf-8"); } catch { continue; }

    // Windows absolute path to the local benchmark root
    if (/[A-Z]:\\[\\/]Boom/gi.test(text)) details.push(`${artifact}:absolute_windows_path_leak`);
    // Unix machine path: /home/<user>/<dir> — must have 2+ segments after /home/
    if (/\/home\/[a-zA-Z0-9_]+\/[a-zA-Z0-9_]/.test(text)) details.push(`${artifact}:absolute_unix_path_leak`);
    // C:\Users\<name>\ (not AppData)
    if (/C:\\Users\\[a-zA-Z0-9_]+\\(?!AppData)/g.test(text)) details.push(`${artifact}:user_directory_path_leak`);
  }

  return {
    violations: details.length,
    details,
    clean: details.length === 0,
  };
}

function scanRepo(repo: ManifestRepo, outDir: string): RawBaselineResult {
  const repoPath = repo.local_path!;
  const start = Date.now();

  // Run pantheon guard (observation only — just to trigger .pantheon/internal population)
  const guardResult = spawnSync(
    "npx",
    ["tsx", PANTHEON_CLI, "guard", `P28b-1 raw baseline scan`, "--scope", "**/*.py"],
    {
      cwd: repoPath,
      encoding: "utf-8",
      shell: true,
      timeout: TIMEOUT_MS,
    }
  );
  const scan_ms = Date.now() - start;
  const timeout = guardResult.signal === "SIGTERM" || scan_ms >= TIMEOUT_MS - 500;
  const crash = !timeout && guardResult.status !== 0 && !guardResult.stdout?.includes("no changed files");

  // Read python observations
  const pythonObsPath = join(repoPath, ".pantheon", "internal", "python_observations.json");
  const pyObsAvailable = existsSync(pythonObsPath);
  let pyObs: any = null;
  if (pyObsAvailable) {
    try { pyObs = JSON.parse(readFileSync(pythonObsPath, "utf-8")); } catch { pyObs = null; }
  }

  const sanitizer = checkSanitizer(repoPath, pyObs);
  const assessment = assessSupportLevel(pyObs, crash, timeout, sanitizer.clean);

  // Check against expected
  assessment.meets_expected = supportRank(assessment.support_level) >= supportRank(repo.expected_min_support);

  const result: RawBaselineResult = {
    repo_id: repo.repo_id,
    category: repo.category,
    local_path: repoPath,
    pinned_commit: repo.pinned_commit,
    expected_min_support: repo.expected_min_support,
    scan_ms,
    timeout,
    exit_code: guardResult.status ?? -1,
    python_obs_path: pythonObsPath,
    python_obs_available: pyObsAvailable,
    python_obs: pyObs,
    support_assessment: assessment,
    sanitizer,
    notes: [
      timeout ? "TIMEOUT" : null,
      crash ? `CRASH(exit=${guardResult.status})` : null,
      !sanitizer.clean ? `SANITIZER(${sanitizer.details.join(",")})` : null,
    ].filter(Boolean).join("; ") || "ok",
  };

  // Write per-repo output
  writeFileSync(join(outDir, "raw_baseline.json"), JSON.stringify(result, null, 2));
  if (pyObs) {
    writeFileSync(join(outDir, "python_obs.json"), JSON.stringify(pyObs, null, 2));
  }

  return result;
}

function main() {
  log("P28b-1 Step 2: Raw Baseline Scan");
  log(`Output: ${BASELINE_RAW_DIR}\n`);

  mkdirSync(BASELINE_RAW_DIR, { recursive: true });

  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf-8"));
  const repos: ManifestRepo[] = manifest.repos.filter((r: ManifestRepo) => {
    if (r.preflight_status !== "ready") return false;
    if (!r.local_path || !existsSync(r.local_path)) return false;
    if (ID_FILTER && r.repo_id !== ID_FILTER) return false;
    if (SKIP_EXISTING && existsSync(join(BASELINE_RAW_DIR, r.repo_id, "raw_baseline.json"))) return false;
    return true;
  });

  log(`Scanning ${repos.length} ready repos...`);

  const results: RawBaselineResult[] = [];
  let crashCount = 0;
  let timeoutCount = 0;
  let sanitizerViolations = 0;

  for (const repo of repos) {
    log(`\n[SCAN] ${repo.repo_id} (${repo.category})`);
    const repoOutDir = join(BASELINE_RAW_DIR, repo.repo_id);
    mkdirSync(repoOutDir, { recursive: true });

    const result = scanRepo(repo, repoOutDir);
    results.push(result);

    if (result.support_assessment.signals.crash) crashCount++;
    if (result.timeout) timeoutCount++;
    if (!result.sanitizer.clean) sanitizerViolations++;

    const icon = result.support_assessment.support_level === "validated" ? "🟢" :
      result.support_assessment.support_level === "supported" ? "🔵" :
      result.support_assessment.support_level === "smoke" ? "🟡" :
      result.support_assessment.support_level === "observed_only" ? "⚪" : "🔴";
    const meetsIcon = result.support_assessment.meets_expected ? "✅" : "❌";

    log(`  ${icon} ${result.support_assessment.support_level.padEnd(15)} | ${meetsIcon} expected:${result.expected_min_support.padEnd(13)} | ${result.scan_ms}ms | gaps:[${result.support_assessment.gaps.join(",")}]`);
  }

  // Write aggregate
  const allGaps: Record<string, string[]> = {};
  for (const r of results) {
    for (const gap of r.support_assessment.gaps) {
      allGaps[gap] = allGaps[gap] ?? [];
      allGaps[gap].push(r.repo_id);
    }
  }

  const aggregate = {
    schema_version: "p28b_raw_baseline@0.1.0",
    generated_at: new Date().toISOString(),
    repo_count: results.length,
    crash_count: crashCount,
    timeout_count: timeoutCount,
    sanitizer_violation_repos: sanitizerViolations,
    support_levels: SUPPORT_ORDER.reduce((acc, lvl) => {
      acc[lvl] = results.filter(r => r.support_assessment.support_level === lvl).length;
      return acc;
    }, {} as Record<string, number>),
    rates: {
      smoke_or_better: Math.round((results.filter(r => supportRank(r.support_assessment.support_level) >= supportRank("smoke")).length / results.length) * 100),
      supported_or_better: Math.round((results.filter(r => supportRank(r.support_assessment.support_level) >= supportRank("supported")).length / results.length) * 100),
      meets_expected: Math.round((results.filter(r => r.support_assessment.meets_expected).length / results.length) * 100),
    },
    top_gaps: Object.entries(allGaps)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 10)
      .map(([kind, repos]) => ({ kind, frequency: repos.length, repos })),
    repos: results.map(r => ({
      repo_id: r.repo_id,
      category: r.category,
      support_level: r.support_assessment.support_level,
      meets_expected: r.support_assessment.meets_expected,
      expected_min_support: r.expected_min_support,
      gaps: r.support_assessment.gaps,
      timeout: r.timeout,
      crash: r.support_assessment.signals.crash,
      sanitizer_clean: r.sanitizer.clean,
      scan_ms: r.scan_ms,
      python_file_count: r.support_assessment.signals.python_file_count,
      notes: r.notes,
    })),
  };

  writeFileSync(join(BASELINE_RAW_DIR, "aggregate.json"), JSON.stringify(aggregate, null, 2));

  // Console summary
  log(`\n=== Step 2 Raw Baseline Complete ===`);
  log(`Repos scanned: ${results.length}`);
  log(`Crashes: ${crashCount} | Timeouts: ${timeoutCount} | Sanitizer violations: ${sanitizerViolations}`);
  log(`Smoke+: ${aggregate.rates.smoke_or_better}% | Supported+: ${aggregate.rates.supported_or_better}%`);
  log(`\nTop gaps:`);
  for (const g of aggregate.top_gaps.slice(0, 7)) {
    log(`  ${g.kind}: ${g.frequency} repos`);
  }
  log(`\nAggregate: ${join(BASELINE_RAW_DIR, "aggregate.json")}`);
}

main();
