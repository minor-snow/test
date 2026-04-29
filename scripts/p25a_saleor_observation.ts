/**
 * P25a: Saleor Python Observation Script
 *
 * Run: npx tsx scripts/p25a_saleor_observation.ts --repo H:\Boom\salary
 */

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { scanRepo } from "../src/repoObservation/repoScanner.js";
import { loadRepoObservationConfig } from "../src/repoObservation/repoObservationConfigLoader.js";
import { enhanceWithPythonObservations } from "../src/repoObservation/python/pythonObservationEnhancer.js";
import type { PythonObservationSidecar } from "../src/repoObservation/python/types.js";

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
function getFlag(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : undefined;
}

const repoRoot = resolve(getFlag("repo") ?? ".");
const outputDir = resolve(getFlag("output") ?? "data/dogfood/p25-saleor/p25a_python_observation");

console.log("P25a: Saleor Python Observation\n");
console.log(`  Repo: ${repoRoot}`);
console.log(`  Output: ${outputDir}`);
console.log("");

// ---------------------------------------------------------------------------
// 1. Scan
// ---------------------------------------------------------------------------

const obsConfig = loadRepoObservationConfig(repoRoot);
const t0 = Date.now();
const observations = scanRepo({ repoRoot, config: obsConfig.config });
const scanMs = Date.now() - t0;

console.log(`  Scanner: ${observations.meta.file_count} files, ${scanMs}ms`);
console.log(`  Repo state: ${observations.repo.repo_state}`);
console.log("");

// ---------------------------------------------------------------------------
// 2. Python enhancement
// ---------------------------------------------------------------------------

const t1 = Date.now();
const pythonObs = enhanceWithPythonObservations(observations, repoRoot);
const enhanceMs = Date.now() - t1;

console.log(`  Python enhancer: ${enhanceMs}ms`);
console.log("");

// ---------------------------------------------------------------------------
// 3. Print summary
// ---------------------------------------------------------------------------

printSummary(pythonObs);

// ---------------------------------------------------------------------------
// 4. Save artifacts
// ---------------------------------------------------------------------------

mkdirSync(outputDir, { recursive: true });
writeFileSync(join(outputDir, "python_observations.json"), JSON.stringify(pythonObs, null, 2));

// Summary
const summary = {
  repo_label: pythonObs.repo.root_label,
  observed_files: pythonObs.repo.observed_file_count,
  python_files: pythonObs.repo.python_file_count,
  scan_ms: scanMs,
  enhance_ms: enhanceMs,
  quality: pythonObs.quality,
  sensitive_categories: pythonObs.sensitive_zones.map(z => z.category),
  unknown_categories: pythonObs.unknowns.map(u => ({
    category: u.category,
    classification: u.classification,
    count: u.count,
  })),
  limitations: pythonObs.limitations,
};
writeFileSync(join(outputDir, "observation_summary.json"), JSON.stringify(summary, null, 2));

// Module signals report
const moduleReport = generateModuleReport(pythonObs);
writeFileSync(join(outputDir, "saleor_module_signals.md"), moduleReport);

// Also write to .pantheon/internal/ if repo has .pantheon
const pantheonInternal = join(repoRoot, ".pantheon", "internal");
if (existsSync(join(repoRoot, ".pantheon"))) {
  mkdirSync(pantheonInternal, { recursive: true });
  writeFileSync(join(pantheonInternal, "python_observations.json"), JSON.stringify(pythonObs, null, 2));
  console.log(`  → Wrote .pantheon/internal/python_observations.json`);
}

console.log(`  → Wrote ${outputDir}/python_observations.json`);
console.log(`  → Wrote ${outputDir}/observation_summary.json`);
console.log(`  → Wrote ${outputDir}/saleor_module_signals.md`);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function printSummary(obs: PythonObservationSidecar) {
  const q = obs.quality;

  console.log("  Python File Distribution:");
  const bucketCounts = new Map<string, number>();
  for (const f of obs.files) {
    bucketCounts.set(f.bucket, (bucketCounts.get(f.bucket) ?? 0) + 1);
  }
  for (const [bucket, count] of [...bucketCounts.entries()].sort()) {
    console.log(`    ${bucket}: ${count}`);
  }
  console.log("");

  console.log("  Import Observations:");
  console.log(`    Total: ${q.import_observation_count}`);
  console.log(`    project_import: ${q.project_import_count}`);
  console.log(`    declared_package: ${q.declared_package_count}`);
  console.log(`    undeclared_package: ${q.undeclared_package_count}`);
  console.log(`    dynamic: ${q.dynamic_import_count}`);
  console.log("");

  console.log("  Test Mappings:");
  console.log(`    Total: ${q.test_mapping_count}`);
  console.log(`    High confidence: ${q.high_confidence_test_count}`);
  console.log(`    Medium confidence: ${q.medium_confidence_test_count}`);
  console.log("");

  console.log("  Sensitive Zones:");
  for (const z of obs.sensitive_zones) {
    console.log(`    [${z.severity}] ${z.category} (${z.matched_paths.length} files)`);
  }
  console.log("");

  console.log("  Dependency Manifests:");
  console.log(`    Total: ${q.manifest_count}`);
  console.log(`    Low confidence: ${q.low_confidence_manifest_count}`);
  console.log("");

  console.log("  Unknown Taxonomy:");
  for (const u of obs.unknowns) {
    console.log(`    [${u.classification}] ${u.category}: ${u.count}`);
  }
  console.log("");

  console.log("  Quality:");
  console.log(`    Python files: ${q.python_file_count}`);
  console.log(`    Classified: ${q.classified_count} (${(q.classified_ratio * 100).toFixed(1)}%)`);
  console.log(`    Unknown: ${q.unknown_count} (${(q.unknown_ratio * 100).toFixed(1)}%)`);
  console.log("");
}

function generateModuleReport(obs: PythonObservationSidecar): string {
  const lines: string[] = [];

  lines.push("# Saleor Module Signals Report");
  lines.push("");
  lines.push(`**Repo:** ${obs.repo.root_label}`);
  lines.push(`**Python files:** ${obs.repo.python_file_count} / ${obs.repo.observed_file_count}`);
  lines.push("");

  // Bucket distribution
  lines.push("## File Distribution");
  lines.push("");
  lines.push("| Bucket | Count |");
  lines.push("|---|---|");
  const bucketCounts = new Map<string, number>();
  for (const f of obs.files) {
    bucketCounts.set(f.bucket, (bucketCounts.get(f.bucket) ?? 0) + 1);
  }
  for (const [bucket, count] of [...bucketCounts.entries()].sort()) {
    lines.push(`| ${bucket} | ${count} |`);
  }
  lines.push("");

  // Top modules by import count
  lines.push("## Top Project Modules (by import count)");
  lines.push("");
  const moduleCounts = new Map<string, number>();
  for (const imp of obs.import_observations) {
    if (imp.status === "project_import") {
      const parts = imp.raw_specifier.split(".");
      const module = parts.length >= 2 ? parts.slice(0, 2).join(".") : parts[0];
      moduleCounts.set(module, (moduleCounts.get(module) ?? 0) + 1);
    }
  }
  const sortedModules = [...moduleCounts.entries()].sort((a, b) => b[1] - a[1]);
  lines.push("| Module | Import Count |");
  lines.push("|---|---|");
  for (const [mod, count] of sortedModules.slice(0, 20)) {
    lines.push(`| \`${mod}\` | ${count} |`);
  }
  lines.push("");

  // Sensitive zones
  lines.push("## Sensitive Zones");
  lines.push("");
  for (const z of obs.sensitive_zones) {
    lines.push(`### ${z.category} (${z.severity})`);
    lines.push("");
    lines.push(`- **Pattern:** \`${z.path_pattern}\``);
    lines.push(`- **Files:** ${z.matched_paths.length}`);
    lines.push(`- **Source:** ${z.source}`);
    lines.push("");
  }

  // Limitations
  lines.push("## Limitations");
  lines.push("");
  for (const l of obs.limitations) {
    lines.push(`- ${l}`);
  }
  lines.push("");

  lines.push("---");
  lines.push("_Auto-generated by Pantheon P25a._");

  return lines.join("\n");
}
