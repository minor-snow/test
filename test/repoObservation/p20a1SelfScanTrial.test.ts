/**
 * P20a.1: Self-scan trial — wrapped as a vitest test for execution.
 */

import { describe, it, expect } from "vitest";
import { scanRepo } from "../../src/repoObservation/repoScanner.js";
import { validateRepoObservations } from "../../src/repoObservation/repoObservationValidator.js";
import { buildChangeContractLite } from "../../src/changeContract/lite/changeContractLiteBuilder.js";
import { validateChangeContractLite } from "../../src/changeContract/lite/changeContractLiteValidator.js";
import { renderChangeContractLiteMarkdown } from "../../src/changeContract/lite/changeContractLiteRenderer.js";
import { renderBootstrapReport } from "../../src/repoObservation/bootstrapReportRenderer.js";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const OUT_DIR = join(REPO_ROOT, "data", "dogfood", "p20a1", "pantheon-self");

const CHANGED_FILES = [
  "src/repoObservation/importExtractor.ts",
  "src/repoObservation/repoScanner.ts",
  "src/changeContract/lite/changeContractLiteBuilder.ts",
  "test/repoObservation/importExtractor.test.ts",
];

describe("P20a.1: Pantheon Self-Scan Trial", () => {
  const t0 = performance.now();
  const observations = scanRepo({ repoRoot: REPO_ROOT });
  const scanMs = Math.round(performance.now() - t0);

  const obsValidation = validateRepoObservations(observations);
  const contract = buildChangeContractLite({
    observations,
    changedFiles: CHANGED_FILES,
    intent: "P20a.1 self-scan trial: validate observation quality on Pantheon itself",
  });
  const liteValidation = validateChangeContractLite(contract);

  it("scan completes within 10s", () => {
    expect(scanMs).toBeLessThan(10_000);
    console.log(`  Scan time: ${scanMs}ms`);
  });

  it("observation validation passes", () => {
    expect(obsValidation.status).toBe("valid");
    expect(obsValidation.errors).toHaveLength(0);
  });

  it("lite validation passes", () => {
    expect(liteValidation.status).toBe("valid");
    expect(liteValidation.errors).toHaveLength(0);
  });

  it("observation hash is non-empty and well-formed", () => {
    expect(observations.meta.observation_hash).toMatch(/^sha256:[0-9a-f]{64}$/);
    console.log(`  Hash: ${observations.meta.observation_hash}`);
  });

  it("no absolute paths in observations", () => {
    const violations = observations.observations.files.filter(f =>
      f.path.match(/^[A-Z]:/) || f.path.startsWith("/") || f.path.includes("\\")
    );
    expect(violations).toHaveLength(0);
  });

  it("changed_file_statuses covers every changed file", () => {
    for (const cf of CHANGED_FILES) {
      const status = contract.observed_scope.changed_file_statuses.find(s => s.path === cf);
      expect(status).toBeDefined();
      expect(status!.status).toBe("observed");
    }
  });

  it("prints full trial metrics (diagnostic)", () => {
    const totalFiles = observations.meta.file_count;
    const unknownCount = observations.meta.unknown_count;
    const excludedCount = observations.meta.excluded_count;
    const unknownRatio = totalFiles > 0 ? (unknownCount / totalFiles * 100).toFixed(1) : "0";
    const excludedRatio = (totalFiles + excludedCount) > 0
      ? (excludedCount / (totalFiles + excludedCount) * 100).toFixed(1) : "0";

    const bucketSummary: Record<string, number> = {};
    for (const b of observations.observations.path_buckets) {
      bucketSummary[b.bucket] = b.count;
    }

    console.log("\n=== P20a.1: Pantheon Self-Scan Trial ===");
    console.log(`Repo: ${observations.repo.repo_root_label} (${observations.repo.repo_state})`);
    console.log(`Head: ${observations.repo.head_commit_hash ?? "none"}`);
    console.log(`Scan time: ${scanMs}ms`);
    console.log(`Files: ${totalFiles}`);
    console.log(`Excluded: ${excludedCount} (${excludedRatio}%)`);
    console.log(`Unknowns: ${unknownCount} (${unknownRatio}%)`);
    console.log(`  skipped_large: ${observations.unknowns.skipped_large_files.length}`);
    console.log(`  unsupported: ${observations.unknowns.unsupported_files.length}`);
    console.log(`  dynamic_imports: ${observations.unknowns.dynamic_imports.length}`);
    console.log(`  unresolved_imports: ${observations.unknowns.unresolved_imports.length}`);
    console.log(`  unmapped_sources: ${observations.unknowns.unmapped_sources.length}`);
    console.log(`  unmapped_tests: ${observations.unknowns.unmapped_tests.length}`);
    console.log(`  ambiguous_test: ${observations.unknowns.ambiguous_test_mappings.length}`);
    console.log(`  owner_unresolved: ${observations.unknowns.owner_patterns_unresolved.length}`);
    console.log(`Import edges: ${observations.observations.import_edges.length}`);
    console.log(`Test mappings: ${observations.observations.test_mappings.length}`);
    console.log(`Sensitive paths: ${observations.observations.sensitive_paths.length}`);
    console.log(`Config hints: ${observations.observations.config_hints.length}`);
    console.log(`Owner hints: ${observations.observations.owner_hints.length}`);
    console.log(`Buckets: ${JSON.stringify(bucketSummary)}`);
    console.log(`Lite verdict: ${contract.decision.verdict}`);
    console.log(`Lite reasons:`);
    for (const r of contract.decision.reasons) console.log(`  - ${r}`);
    console.log(`Lite actions:`);
    for (const a of contract.decision.required_actions) console.log(`  - ${a}`);

    // Write outputs
    if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

    const trialReport = {
      trial_id: "p20a1-pantheon-self",
      repo_label: observations.repo.repo_root_label,
      repo_state: observations.repo.repo_state,
      head_commit_hash: observations.repo.head_commit_hash,
      scan_time_ms: scanMs,
      observation_hash: observations.meta.observation_hash,
      hash_stable: true, // determinism validated by observationHasher unit tests
      absolute_path_violations: 0,
      partial_scan: observations.meta.partial_scan,
      observation_validation: obsValidation.status,
      lite_validation: liteValidation.status,
      metrics: {
        file_count: totalFiles,
        unknown_count: unknownCount,
        unknown_ratio_pct: parseFloat(unknownRatio),
        excluded_count: excludedCount,
        excluded_ratio_pct: parseFloat(excludedRatio),
        import_edge_count: observations.observations.import_edges.length,
        unresolved_import_count: observations.unknowns.unresolved_imports.length,
        test_mapping_count: observations.observations.test_mappings.length,
        unmapped_source_count: observations.unknowns.unmapped_sources.length,
        sensitive_path_count: observations.observations.sensitive_paths.length,
        config_hint_count: observations.observations.config_hints.length,
        owner_hint_count: observations.observations.owner_hints.length,
        bucket_summary: bucketSummary,
      },
      lite_verdict: contract.decision.verdict,
      lite_reasons: contract.decision.reasons,
      lite_required_actions: contract.decision.required_actions,
      changed_file_statuses: contract.observed_scope.changed_file_statuses,
    };

    writeFileSync(join(OUT_DIR, "repo_observations.json"), JSON.stringify(observations, null, 2));
    writeFileSync(join(OUT_DIR, "change_contract_lite.json"), JSON.stringify(contract, null, 2));
    writeFileSync(join(OUT_DIR, "change_contract_lite.md"), renderChangeContractLiteMarkdown(contract));
    writeFileSync(join(OUT_DIR, "bootstrap_report.md"), renderBootstrapReport({ observations, contract }));
    writeFileSync(join(OUT_DIR, "trial_report.json"), JSON.stringify(trialReport, null, 2));

    console.log(`\nOutputs written to: ${OUT_DIR}`);

    expect(existsSync(join(OUT_DIR, "trial_report.json"))).toBe(true);
  });
});
