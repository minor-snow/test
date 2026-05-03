/**
 * P20a: Observation Hash
 *
 * Computes a deterministic hash over the full observation content.
 * Excludes: scanned_at, absolute repo_root, meta.observation_hash.
 * Includes: scanner_version, limits, observations, unknowns, excluded,
 *           meta.partial_scan, meta.file_count, meta.unknown_count,
 *           meta.excluded_count, repo_state, head_commit_hash,
 *           has_uncommitted_changes, uncommitted_file_count.
 *
 * All arrays sorted before hash for order-independence.
 */
import { computeHash } from "../hash.js";
import { stableSerialize } from "../stableSerialize.js";
/**
 * Compute the observation hash for a set of repo observations.
 *
 * The hash is deterministic: identical observations produce identical hashes
 * regardless of array ordering, absolute repo root, or scan timestamp.
 */
export function computeObservationHash(obs) {
    const payload = buildHashPayload(obs);
    return computeHash(stableSerialize(payload));
}
// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------
function buildHashPayload(obs) {
    return {
        schema_version: obs.schema_version,
        // Repo identity (without absolute path or timestamp)
        repo_state: obs.repo.repo_state,
        head_commit_hash: obs.repo.head_commit_hash,
        has_uncommitted_changes: obs.repo.has_uncommitted_changes,
        uncommitted_file_count: obs.repo.uncommitted_file_count,
        // Scanner config
        scanner_version: obs.scanner.scanner_version,
        limits: obs.limits,
        // Observations (all arrays sorted)
        files: sortBy([...obs.observations.files], f => f.path),
        path_buckets: sortBy([...obs.observations.path_buckets].map(b => ({
            ...b,
            paths: [...b.paths].sort(),
        })), b => b.bucket),
        import_edges: sortBy([...obs.observations.import_edges], e => `${e.from_file}\0${e.raw_specifier}\0${e.import_kind}`),
        test_mappings: sortBy([...obs.observations.test_mappings], m => `${m.source_path}\0${m.test_path}`),
        sensitive_paths: sortBy([...obs.observations.sensitive_paths], s => `${s.path}\0${s.reason}`),
        owner_hints: sortBy([...obs.observations.owner_hints], h => `${h.path_pattern}\0${h.owners.join(",")}`),
        config_hints: sortBy([...obs.observations.config_hints], c => c.config_path),
        package_manifests: sortBy([...obs.observations.package_manifests], m => m.package_json_path),
        // Unknowns (all arrays sorted)
        unknowns: sortUnknowns(obs.unknowns),
        // Excluded (sorted)
        excluded: sortBy([...obs.excluded], e => `${e.path}\0${e.reason}`),
        // Quality
        quality: obs.quality,
        // Meta (excluding observation_hash itself)
        partial_scan: obs.meta.partial_scan,
        file_count: obs.meta.file_count,
        unknown_count: obs.meta.unknown_count,
        excluded_count: obs.meta.excluded_count,
    };
}
function sortUnknowns(u) {
    return {
        skipped_large_files: [...u.skipped_large_files].sort(),
        unsupported_files: [...u.unsupported_files].sort(),
        dynamic_imports: [...u.dynamic_imports].sort(),
        unresolved_imports: [...u.unresolved_imports].sort(),
        unmapped_sources: [...u.unmapped_sources].sort(),
        unmapped_tests: [...u.unmapped_tests].sort(),
        ambiguous_test_mappings: [...u.ambiguous_test_mappings].sort(),
        scan_limit_exceeded: [...u.scan_limit_exceeded].sort(),
        owner_patterns_unresolved: [...u.owner_patterns_unresolved].sort(),
        changed_files_not_observed: [...u.changed_files_not_observed].sort(),
    };
}
function sortBy(arr, keyFn) {
    return arr.sort((a, b) => keyFn(a).localeCompare(keyFn(b)));
}
//# sourceMappingURL=observationHasher.js.map