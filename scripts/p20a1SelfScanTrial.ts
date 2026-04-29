/**
 * P20a.1: Self-scan trial runner
 * Runs P20a against Pantheon itself and outputs trial data.
 */

import { scanRepo } from "../src/repoObservation/repoScanner.js";
import { validateRepoObservations } from "../src/repoObservation/repoObservationValidator.js";
import { buildChangeContractLite } from "../src/changeContract/lite/changeContractLiteBuilder.js";
import { validateChangeContractLite } from "../src/changeContract/lite/changeContractLiteValidator.js";
import { renderChangeContractLiteMarkdown } from "../src/changeContract/lite/changeContractLiteRenderer.js";
import { renderBootstrapReport } from "../src/repoObservation/bootstrapReportRenderer.js";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = join(import.meta.dirname, "..");
const OUT_DIR = join(REPO_ROOT, "data", "dogfood", "p20a1", "pantheon-self");

const CHANGED_FILES = [
  "src/repoObservation/importExtractor.ts",
  "src/repoObservation/repoScanner.ts",
  "src/changeContract/lite/changeContractLiteBuilder.ts",
  "test/repoObservation/importExtractor.test.ts",
];

const INTENT = "P20a.1 self-scan trial: validate observation quality on Pantheon itself";

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const t0 = performance.now();
const observations = scanRepo({ repoRoot: REPO_ROOT });
const scanMs = performance.now() - t0;

const obsValidation = validateRepoObservations(observations);
const contract = buildChangeContractLite({ observations, changedFiles: CHANGED_FILES, intent: INTENT });
const liteValidation = validateChangeContractLite(contract);
const contractMd = renderChangeContractLiteMarkdown(contract);
const report = renderBootstrapReport({ observations, contract });

// ---------------------------------------------------------------------------
// Trial metrics
// ---------------------------------------------------------------------------

const totalFiles = observations.meta.file_count;
const unknownCount = observations.meta.unknown_count;
const excludedCount = observations.meta.excluded_count;
const unknownRatio = totalFiles > 0 ? (unknownCount / totalFiles * 100).toFixed(1) : "0";
const excludedRatio = (totalFiles + excludedCount) > 0
  ? (excludedCount / (totalFiles + excludedCount) * 100).toFixed(1) : "0";

const importEdgeCount = observations.observations.import_edges.length;
const unresolvedImportCount = observations.unknowns.unresolved_imports.length;
const testMappingCount = observations.observations.test_mappings.length;
const unmappedSourceCount = observations.unknowns.unmapped_sources.length;
const sensPathCount = observations.observations.sensitive_paths.length;
const configHintCount = observations.observations.config_hints.length;
const ownerHintCount = observations.observations.owner_hints.length;

const bucketSummary: Record<string, number> = {};
for (const b of observations.observations.path_buckets) {
  bucketSummary[b.bucket] = b.count;
}

const trialReport = {
  trial_id: "p20a1-pantheon-self",
  repo_label: observations.repo.repo_root_label,
  repo_state: observations.repo.repo_state,
  head_commit_hash: observations.repo.head_commit_hash,
  scan_time_ms: Math.round(scanMs),
  observation_hash: observations.meta.observation_hash,
  partial_scan: observations.meta.partial_scan,
  observation_validation: obsValidation.status,
  observation_errors: obsValidation.errors,
  lite_validation: liteValidation.status,
  lite_errors: liteValidation.errors,
  metrics: {
    file_count: totalFiles,
    unknown_count: unknownCount,
    unknown_ratio_pct: parseFloat(unknownRatio),
    excluded_count: excludedCount,
    excluded_ratio_pct: parseFloat(excludedRatio),
    import_edge_count: importEdgeCount,
    unresolved_import_count: unresolvedImportCount,
    test_mapping_count: testMappingCount,
    unmapped_source_count: unmappedSourceCount,
    sensitive_path_count: sensPathCount,
    config_hint_count: configHintCount,
    owner_hint_count: ownerHintCount,
    bucket_summary: bucketSummary,
  },
  lite_verdict: contract.decision.verdict,
  lite_reasons: contract.decision.reasons,
  lite_required_actions: contract.decision.required_actions,
  changed_file_statuses: contract.observed_scope.changed_file_statuses,
};

// ---------------------------------------------------------------------------
// Second scan for hash stability
// ---------------------------------------------------------------------------

const observations2 = scanRepo({ repoRoot: REPO_ROOT });
const hashStable = observations.meta.observation_hash === observations2.meta.observation_hash;
(trialReport as any).hash_stability = {
  scan1: observations.meta.observation_hash,
  scan2: observations2.meta.observation_hash,
  stable: hashStable,
};

// ---------------------------------------------------------------------------
// Check no absolute paths
// ---------------------------------------------------------------------------

const absolutePathFiles = observations.observations.files.filter(f =>
  f.path.match(/^[A-Z]:/) || f.path.startsWith("/") || f.path.includes("\\")
);
(trialReport as any).absolute_path_check = {
  passed: absolutePathFiles.length === 0,
  violations: absolutePathFiles.map(f => f.path),
};

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

writeFileSync(join(OUT_DIR, "repo_observations.json"), JSON.stringify(observations, null, 2));
writeFileSync(join(OUT_DIR, "change_contract_lite.json"), JSON.stringify(contract, null, 2));
writeFileSync(join(OUT_DIR, "change_contract_lite.md"), contractMd);
writeFileSync(join(OUT_DIR, "bootstrap_report.md"), report);
writeFileSync(join(OUT_DIR, "trial_report.json"), JSON.stringify(trialReport, null, 2));

// ---------------------------------------------------------------------------
// Console summary
// ---------------------------------------------------------------------------

console.log("=== P20a.1: Pantheon Self-Scan Trial ===");
console.log(`Repo: ${trialReport.repo_label} (${trialReport.repo_state})`);
console.log(`Scan time: ${trialReport.scan_time_ms}ms`);
console.log(`Files: ${totalFiles}`);
console.log(`Excluded: ${excludedCount} (${excludedRatio}%)`);
console.log(`Unknowns: ${unknownCount} (${unknownRatio}%)`);
console.log(`Import edges: ${importEdgeCount} (${unresolvedImportCount} unresolved)`);
console.log(`Test mappings: ${testMappingCount} (${unmappedSourceCount} unmapped sources)`);
console.log(`Sensitive paths: ${sensPathCount}`);
console.log(`Config hints: ${configHintCount}`);
console.log(`Owner hints: ${ownerHintCount}`);
console.log(`Bucket summary: ${JSON.stringify(bucketSummary)}`);
console.log(`Observation hash: ${trialReport.observation_hash}`);
console.log(`Hash stable: ${hashStable}`);
console.log(`Absolute paths: ${absolutePathFiles.length === 0 ? "CLEAN" : "VIOLATIONS"}`);
console.log(`Observation validation: ${obsValidation.status}`);
console.log(`Lite validation: ${liteValidation.status}`);
console.log(`Lite verdict: ${contract.decision.verdict}`);
console.log(`Lite reasons:`);
for (const r of contract.decision.reasons) console.log(`  - ${r}`);
console.log(`\nOutputs: ${OUT_DIR}`);
