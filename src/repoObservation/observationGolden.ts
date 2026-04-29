/**
 * P20a.3: Observation Golden Baseline
 *
 * Builds summary snapshots from RepoObservations and compares
 * against stored golden baselines to detect scanner regression.
 *
 * Does NOT store full observation dumps — only shape/quality summaries.
 */

import type {
  RepoObservations, GoldenObservationSnapshot,
  ObservationGoldenThresholds, ObservationGoldenComparison,
} from "./types.js";
import { validateRepoObservations } from "./repoObservationValidator.js";

// ---------------------------------------------------------------------------
// Default thresholds
// ---------------------------------------------------------------------------

export const DEFAULT_GOLDEN_THRESHOLDS: ObservationGoldenThresholds = {
  fail: {
    absolute_paths_max: 0,
    unknown_bucket_files_max: 10,
    observation_must_validate: true,
  },
  warn: {
    actionable_unknown_ratio_max_delta_pp: 5,
    unresolved_imports_max_delta: 10,
  },
};

// ---------------------------------------------------------------------------
// Build snapshot
// ---------------------------------------------------------------------------

export function buildGoldenObservationSnapshot(input: {
  observations: RepoObservations;
  target: string;
  configLoadedFrom: string | null;
  thresholds?: ObservationGoldenThresholds;
}): GoldenObservationSnapshot {
  const { observations: obs, target, configLoadedFrom } = input;
  const thresholds = input.thresholds ?? DEFAULT_GOLDEN_THRESHOLDS;

  // Bucket counts
  const bucketCounts: Record<string, number> = {};
  for (const b of obs.observations.path_buckets) {
    bucketCounts[b.bucket] = b.count;
  }

  // Import resolution counts
  const importResolutionCounts: Record<string, number> = {};
  for (const edge of obs.observations.import_edges) {
    importResolutionCounts[edge.resolution_status] =
      (importResolutionCounts[edge.resolution_status] ?? 0) + 1;
  }

  return {
    schema_version: "golden_observation_snapshot.v1",
    target,
    generated_at: new Date().toISOString(),

    scanner: {
      scanner_version: obs.scanner.scanner_version,
      config_loaded_from: configLoadedFrom,
    },

    repo: {
      repo_state: obs.repo.repo_state,
      head_commit_hash: obs.repo.head_commit_hash,
      has_uncommitted_changes: obs.repo.has_uncommitted_changes,
    },

    snapshot: {
      observation_hash: obs.meta.observation_hash,
      file_count: obs.meta.file_count,
      bucket_counts: bucketCounts,
      import_edge_count: obs.observations.import_edges.length,
      import_resolution_counts: importResolutionCounts,
      test_mapping_count: obs.observations.test_mappings.length,
      sensitive_path_count: obs.observations.sensitive_paths.length,
      owner_hint_count: obs.observations.owner_hints.length,
      package_manifest_count: obs.observations.package_manifests.length,
      unknown_taxonomy_counts: {
        out_of_scope: obs.quality.out_of_scope_count,
        actionable: obs.quality.actionable_count,
        intrinsic: obs.quality.intrinsic_count,
      },
      quality: {
        raw_unknown_count: obs.quality.raw_unknown_count,
        raw_unknown_ratio: obs.quality.raw_unknown_ratio,
        out_of_scope_count: obs.quality.out_of_scope_count,
        out_of_scope_ratio: obs.quality.out_of_scope_ratio,
        actionable_count: obs.quality.actionable_count,
        actionable_ratio: obs.quality.actionable_ratio,
        intrinsic_count: obs.quality.intrinsic_count,
        intrinsic_ratio: obs.quality.intrinsic_ratio,
        unknown_bucket_file_count: obs.quality.unknown_bucket_file_count,
        undeclared_package_count: obs.quality.undeclared_package_count,
      },
    },

    thresholds,
  };
}

// ---------------------------------------------------------------------------
// Compare snapshots
// ---------------------------------------------------------------------------

export function compareObservationGolden(input: {
  golden: GoldenObservationSnapshot;
  current: GoldenObservationSnapshot;
  currentObservations?: RepoObservations;
}): ObservationGoldenComparison {
  const { golden, current, currentObservations } = input;
  const thresholds = golden.thresholds;

  const failReasons: string[] = [];
  const warnings: string[] = [];

  // --- Hard fail checks ---

  // 1. Absolute paths emitted
  if (currentObservations) {
    const absolutePathViolations = currentObservations.observations.files.filter(f =>
      /^[A-Z]:/.test(f.path) || f.path.startsWith("/") || f.path.includes("\\"),
    );
    if (absolutePathViolations.length > thresholds.fail.absolute_paths_max) {
      failReasons.push(
        `Absolute paths emitted: ${absolutePathViolations.length} (max: ${thresholds.fail.absolute_paths_max})`,
      );
    }
  }

  // 2. Unknown bucket files over max
  if (current.snapshot.quality.unknown_bucket_file_count > thresholds.fail.unknown_bucket_files_max) {
    failReasons.push(
      `Unknown bucket files: ${current.snapshot.quality.unknown_bucket_file_count} (max: ${thresholds.fail.unknown_bucket_files_max})`,
    );
  }

  // 3. Observation validation
  if (thresholds.fail.observation_must_validate && currentObservations) {
    const validation = validateRepoObservations(currentObservations);
    if (validation.status !== "valid") {
      failReasons.push(
        `Observation validation failed: ${validation.errors.join("; ")}`,
      );
    }
  }

  // --- Warning checks ---

  // 4. Actionable unknown ratio drift
  const actionableRatioDeltaPp =
    (current.snapshot.quality.actionable_ratio - golden.snapshot.quality.actionable_ratio) * 100;
  if (actionableRatioDeltaPp > thresholds.warn.actionable_unknown_ratio_max_delta_pp) {
    warnings.push(
      `Actionable unknown ratio increased by ${actionableRatioDeltaPp.toFixed(1)}pp (max: ${thresholds.warn.actionable_unknown_ratio_max_delta_pp}pp)`,
    );
  }

  // 5. Unresolved imports drift
  const unresolvedImportsDelta =
    (current.snapshot.quality.undeclared_package_count + countResolution(current, "unresolved_package"))
    - (golden.snapshot.quality.undeclared_package_count + countResolution(golden, "unresolved_package"));
  if (unresolvedImportsDelta > thresholds.warn.unresolved_imports_max_delta) {
    warnings.push(
      `Unresolved imports increased by ${unresolvedImportsDelta} (max: ${thresholds.warn.unresolved_imports_max_delta})`,
    );
  }

  // --- Compute diffs ---
  const diffs = computeDiffs(golden, current);

  // Hash change is diagnostic only (logged in diffs, not fail/warn)

  const status: ObservationGoldenComparison["status"] =
    failReasons.length > 0 ? "fail"
    : warnings.length > 0 ? "pass_with_warnings"
    : "pass";

  return { status, fail_reasons: failReasons, warnings, diffs };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function countResolution(snapshot: GoldenObservationSnapshot, status: string): number {
  return (snapshot.snapshot.import_resolution_counts as Record<string, number>)[status] ?? 0;
}

function computeDiffs(
  golden: GoldenObservationSnapshot,
  current: GoldenObservationSnapshot,
): ObservationGoldenComparison["diffs"] {
  // Bucket count deltas
  const allBuckets = new Set([
    ...Object.keys(golden.snapshot.bucket_counts),
    ...Object.keys(current.snapshot.bucket_counts),
  ]);
  const bucketCountDeltas: Record<string, number> = {};
  for (const b of allBuckets) {
    const g = (golden.snapshot.bucket_counts as Record<string, number>)[b] ?? 0;
    const c = (current.snapshot.bucket_counts as Record<string, number>)[b] ?? 0;
    bucketCountDeltas[b] = c - g;
  }

  // Import resolution count deltas
  const allStatuses = new Set([
    ...Object.keys(golden.snapshot.import_resolution_counts),
    ...Object.keys(current.snapshot.import_resolution_counts),
  ]);
  const importResolutionCountDeltas: Record<string, number> = {};
  for (const s of allStatuses) {
    const g = (golden.snapshot.import_resolution_counts as Record<string, number>)[s] ?? 0;
    const c = (current.snapshot.import_resolution_counts as Record<string, number>)[s] ?? 0;
    importResolutionCountDeltas[s] = c - g;
  }

  return {
    observation_hash_changed:
      golden.snapshot.observation_hash !== current.snapshot.observation_hash,
    file_count_delta:
      current.snapshot.file_count - golden.snapshot.file_count,
    bucket_count_deltas: bucketCountDeltas,
    import_resolution_count_deltas: importResolutionCountDeltas,
    unknown_taxonomy_count_deltas: {
      out_of_scope:
        current.snapshot.unknown_taxonomy_counts.out_of_scope - golden.snapshot.unknown_taxonomy_counts.out_of_scope,
      actionable:
        current.snapshot.unknown_taxonomy_counts.actionable - golden.snapshot.unknown_taxonomy_counts.actionable,
      intrinsic:
        current.snapshot.unknown_taxonomy_counts.intrinsic - golden.snapshot.unknown_taxonomy_counts.intrinsic,
    },
    quality_deltas: {
      raw_unknown_ratio_delta_pp:
        (current.snapshot.quality.raw_unknown_ratio - golden.snapshot.quality.raw_unknown_ratio) * 100,
      actionable_unknown_ratio_delta_pp:
        (current.snapshot.quality.actionable_ratio - golden.snapshot.quality.actionable_ratio) * 100,
      out_of_scope_unknown_ratio_delta_pp:
        (current.snapshot.quality.out_of_scope_ratio - golden.snapshot.quality.out_of_scope_ratio) * 100,
      intrinsic_unknown_ratio_delta_pp:
        (current.snapshot.quality.intrinsic_ratio - golden.snapshot.quality.intrinsic_ratio) * 100,
      unresolved_imports_delta:
        countResolution(current, "unresolved_package") - countResolution(golden, "unresolved_package"),
      undeclared_packages_delta:
        current.snapshot.quality.undeclared_package_count - golden.snapshot.quality.undeclared_package_count,
    },
  };
}
