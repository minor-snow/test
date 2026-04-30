/**
 * P20a.3: Golden Observation Baseline — Regression Test
 *
 * Scans Pantheon itself, builds a golden snapshot, and compares
 * against the stored golden baseline to detect scanner regression.
 *
 * First run generates the golden file.
 * Subsequent runs compare against it.
 */

import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { scanRepo } from "../../src/repoObservation/repoScanner.js";
import { validateRepoObservations } from "../../src/repoObservation/repoObservationValidator.js";
import {
  buildGoldenObservationSnapshot,
  compareObservationGolden,
  DEFAULT_GOLDEN_THRESHOLDS,
} from "../../src/repoObservation/observationGolden.js";
import type { GoldenObservationSnapshot } from "../../src/repoObservation/types.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const OUT_DIR = join(REPO_ROOT, "data", "dogfood", "p20a3");
const GOLDEN_PATH = join(OUT_DIR, "golden_observation_snapshot.json");

describe("P20a.3: Golden Observation Baseline", () => {
  // Scan once
  const observations = scanRepo({ repoRoot: REPO_ROOT });
  const currentSnapshot = buildGoldenObservationSnapshot({
    observations,
    target: "pantheon-self",
    configLoadedFrom: null,
  });

  // --- Invariant tests (always run) ---

  it("observation validation passes", () => {
    const result = validateRepoObservations(observations);
    expect(result.status).toBe("valid");
    expect(result.errors).toHaveLength(0);
  });

  it("no absolute paths in observations", () => {
    const violations = observations.observations.files.filter(f =>
      /^[A-Z]:/.test(f.path) || f.path.startsWith("/") || f.path.includes("\\"),
    );
    expect(violations).toHaveLength(0);
  });

  it("unknown_bucket_files within threshold", () => {
    expect(observations.quality.unknown_bucket_file_count)
      .toBeLessThanOrEqual(DEFAULT_GOLDEN_THRESHOLDS.fail.unknown_bucket_files_max);
  });

  it("quality metrics are computed", () => {
    expect(observations.quality).toBeDefined();
    expect(observations.quality.taxonomy).toBeDefined();
    expect(observations.quality.raw_unknown_ratio).toBeGreaterThanOrEqual(0);
  });

  it("snapshot does not contain full file list", () => {
    expect((currentSnapshot as any).files).toBeUndefined();
    expect((currentSnapshot.snapshot as any).files).toBeUndefined();
  });

  // --- Golden comparison (conditional) ---

  it("compares against golden baseline (or generates it)", () => {
    if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

    if (!existsSync(GOLDEN_PATH)) {
      // First run: generate golden
      writeFileSync(GOLDEN_PATH, JSON.stringify(currentSnapshot, null, 2));
      console.log(`[P20a.3] Generated golden baseline: ${GOLDEN_PATH}`);
      console.log(`[P20a.3]   file_count: ${currentSnapshot.snapshot.file_count}`);
      console.log(`[P20a.3]   bucket_counts: ${JSON.stringify(currentSnapshot.snapshot.bucket_counts)}`);
      console.log(`[P20a.3]   import_edge_count: ${currentSnapshot.snapshot.import_edge_count}`);
      console.log(`[P20a.3]   unknown_taxonomy: ${JSON.stringify(currentSnapshot.snapshot.unknown_taxonomy_counts)}`);
      console.log(`[P20a.3]   quality.actionable_ratio: ${(currentSnapshot.snapshot.quality.actionable_ratio * 100).toFixed(1)}%`);
      console.log(`[P20a.3]   quality.unknown_bucket_files: ${currentSnapshot.snapshot.quality.unknown_bucket_file_count}`);
      expect(existsSync(GOLDEN_PATH)).toBe(true);
      return;
    }

    // Subsequent runs: compare
    const golden: GoldenObservationSnapshot = JSON.parse(readFileSync(GOLDEN_PATH, "utf-8"));
    const comparison = compareObservationGolden({
      golden,
      current: currentSnapshot,
      currentObservations: observations,
    });

    // Write comparison report
    const reportPath = join(OUT_DIR, "golden_comparison_report.json");
    writeFileSync(reportPath, JSON.stringify({
      compared_at: new Date().toISOString(),
      golden_generated_at: golden.generated_at,
      status: comparison.status,
      fail_reasons: comparison.fail_reasons,
      warnings: comparison.warnings,
      diffs: comparison.diffs,
      current_snapshot: currentSnapshot.snapshot,
      golden_snapshot: golden.snapshot,
    }, null, 2));

    // Log results
    console.log(`[P20a.3] Golden comparison: ${comparison.status}`);
    if (comparison.diffs.observation_hash_changed) {
      console.log(`[P20a.3]   observation_hash changed (diagnostic)`);
    }
    console.log(`[P20a.3]   file_count_delta: ${comparison.diffs.file_count_delta}`);
    for (const [bucket, delta] of Object.entries(comparison.diffs.bucket_count_deltas)) {
      if (delta !== 0) console.log(`[P20a.3]   bucket ${bucket}: ${delta > 0 ? "+" : ""}${delta}`);
    }
    for (const w of comparison.warnings) {
      console.warn(`[P20a.3]   WARNING: ${w}`);
    }
    for (const f of comparison.fail_reasons) {
      console.error(`[P20a.3]   FAIL: ${f}`);
    }

    // Hard fails break the test
    expect(comparison.fail_reasons).toHaveLength(0);

    // Warnings are logged but don't break
    if (comparison.status === "pass_with_warnings") {
      console.warn(`[P20a.3] Passed with ${comparison.warnings.length} warning(s)`);
    }
  });

  // Write current snapshot for debugging
  it("writes current snapshot (diagnostic)", () => {
    if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(
      join(OUT_DIR, "current_observation_snapshot.json"),
      JSON.stringify(currentSnapshot, null, 2),
    );
    console.log(`[P20a.3] Current snapshot written to ${OUT_DIR}`);
    expect(existsSync(join(OUT_DIR, "current_observation_snapshot.json"))).toBe(true);
  });
});
