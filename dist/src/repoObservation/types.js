/**
 * P20a: Deterministic Repo Observations — Domain Types
 *
 * Core invariants:
 *   - All paths are repo-relative POSIX (no absolute, no escaping ..)
 *   - observation_hash is deterministic: same repo state → same hash
 *   - scanner.llm_used is always false in P20a
 *   - RepoObservations is an observed index, NOT canonical architecture truth
 */
export const DEFAULT_EXCLUDED_DIRS = [
    "node_modules",
    "dist",
    "build",
    "coverage",
    ".git",
    ".next",
    "out",
    ".cache",
    "tmp",
    ".tmp-pet-build",
];
export const DEFAULT_SCAN_LIMITS = {
    max_file_bytes: 512 * 1024, // 512 KB
    max_total_files: 10_000,
    max_import_edges: 50_000,
    scan_timeout_ms: 60_000, // 60 seconds
    excluded_dirs: DEFAULT_EXCLUDED_DIRS,
};
//# sourceMappingURL=types.js.map