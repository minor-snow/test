/**
 * P20a.2: Observation Quality Metrics
 *
 * Computes quality metrics and unknown taxonomy from repo observations.
 * Splits unknowns into three categories:
 *   - out_of_scope: unsupported files/languages (scanner can't help)
 *   - actionable: unmapped sources, undeclared packages (user can fix)
 *   - intrinsic: dynamic imports, large files (deterministic scanner limit)
 */

import type {
  RepoObservations, RepoObservationQuality, UnknownTaxonomy,
} from "./types.js";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute quality metrics from observations.
 * Call after unknowns are populated but before hash computation.
 */
export function computeObservationQuality(
  obs: RepoObservations,
): RepoObservationQuality {
  const taxonomy = computeUnknownTaxonomy(obs);
  const fileCount = obs.meta.file_count || 1; // avoid division by zero

  const outOfScopeCount =
    taxonomy.out_of_scope.unsupported_files.length;

  const actionableCount =
    taxonomy.actionable.unmapped_sources.length +
    taxonomy.actionable.unmapped_tests.length +
    taxonomy.actionable.undeclared_packages.length +
    taxonomy.actionable.unresolved_aliases.length +
    taxonomy.actionable.unknown_packages.length +
    taxonomy.actionable.owner_patterns_unresolved.length;

  const intrinsicCount =
    taxonomy.intrinsic.dynamic_imports.length +
    taxonomy.intrinsic.skipped_large_files.length +
    taxonomy.intrinsic.scan_limit_exceeded.length;

  const rawUnknownCount = obs.meta.unknown_count;

  // Undeclared packages: count import edges with undeclared_package status
  const undeclaredPackageCount =
    obs.observations.import_edges.filter(e => e.resolution_status === "undeclared_package").length;

  // Unknown bucket files
  const unknownBucketFileCount =
    obs.observations.files.filter(f => f.bucket === "unknown").length;

  return {
    raw_unknown_count: rawUnknownCount,
    raw_unknown_ratio: rawUnknownCount / fileCount,

    out_of_scope_count: outOfScopeCount,
    out_of_scope_ratio: outOfScopeCount / fileCount,

    actionable_count: actionableCount,
    actionable_ratio: actionableCount / fileCount,

    intrinsic_count: intrinsicCount,
    intrinsic_ratio: intrinsicCount / fileCount,

    unknown_bucket_file_count: unknownBucketFileCount,
    undeclared_package_count: undeclaredPackageCount,

    taxonomy,
  };
}

/**
 * Generate operator-facing recommendations based on quality metrics.
 */
export function generateObservationRecommendations(input: {
  quality: RepoObservationQuality;
}): string[] {
  const { quality } = input;
  const recs: string[] = [];

  if (quality.taxonomy.actionable.unmapped_sources.length > 0) {
    recs.push(
      `Add test_mapping_overrides in pantheon.json for ${quality.taxonomy.actionable.unmapped_sources.length} unmapped source file(s).`,
    );
  }

  if (quality.taxonomy.actionable.unmapped_tests.length > 0) {
    recs.push(
      `Review ${quality.taxonomy.actionable.unmapped_tests.length} unmapped test file(s): rename to follow convention or add test_mapping_overrides.`,
    );
  }

  if (quality.taxonomy.actionable.undeclared_packages.length > 0) {
    recs.push(
      `Add ${quality.taxonomy.actionable.undeclared_packages.length} undeclared package(s) to package.json or review import usage.`,
    );
  }

  if (quality.taxonomy.actionable.unknown_packages.length > 0) {
    recs.push(
      `${quality.taxonomy.actionable.unknown_packages.length} package(s) could not be classified (no package.json found). Ensure package.json exists.`,
    );
  }

  if (quality.unknown_bucket_file_count > 0) {
    recs.push(
      `Add path_roles in pantheon.json for ${quality.unknown_bucket_file_count} file(s) in the 'unknown' bucket.`,
    );
  }

  if (quality.taxonomy.out_of_scope.unsupported_files.length > 0) {
    recs.push(
      `${quality.taxonomy.out_of_scope.unsupported_files.length} file(s) use unsupported languages. Add language support only if they are in governance scope.`,
    );
  }

  if (quality.taxonomy.intrinsic.dynamic_imports.length > 0) {
    recs.push(
      `Review ${quality.taxonomy.intrinsic.dynamic_imports.length} dynamic import(s) manually; deterministic scanner cannot resolve them.`,
    );
  }

  return recs;
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

function computeUnknownTaxonomy(obs: RepoObservations): UnknownTaxonomy {
  // Undeclared packages from import edges
  const undeclaredPackages = new Set<string>();
  const unknownPackages = new Set<string>();
  for (const edge of obs.observations.import_edges) {
    if (edge.resolution_status === "undeclared_package") {
      undeclaredPackages.add(`${edge.from_file}:${edge.raw_specifier}`);
    }
    if (edge.resolution_status === "unknown_package") {
      unknownPackages.add(`${edge.from_file}:${edge.raw_specifier}`);
    }
  }

  // Unresolved aliases from import edges
  const unresolvedAliases = obs.observations.import_edges
    .filter(e => e.resolution_status === "unresolved_alias")
    .map(e => `${e.from_file}:${e.raw_specifier}`);

  return {
    out_of_scope: {
      unsupported_files: [...obs.unknowns.unsupported_files],
    },
    actionable: {
      unmapped_sources: [...obs.unknowns.unmapped_sources],
      unmapped_tests: [...obs.unknowns.unmapped_tests],
      undeclared_packages: [...undeclaredPackages],
      unresolved_aliases: unresolvedAliases,
      unknown_packages: [...unknownPackages],
      owner_patterns_unresolved: [...obs.unknowns.owner_patterns_unresolved],
    },
    intrinsic: {
      dynamic_imports: [...obs.unknowns.dynamic_imports],
      skipped_large_files: [...obs.unknowns.skipped_large_files],
      scan_limit_exceeded: [...obs.unknowns.scan_limit_exceeded],
    },
  };
}
