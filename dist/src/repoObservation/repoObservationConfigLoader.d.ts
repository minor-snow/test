/**
 * P20a.2: Repo Observation Config Loader
 *
 * Loads `pantheon.json` from repo root and extracts `repo_observation` config.
 * Only supports exact-match patterns — no globs, no regex.
 *
 * Config schema:
 * {
 *   "repo_observation": {
 *     "excluded_dirs": ["dir1", "dir2"],
 *     "path_roles": { "prefix/path": "generated" },
 *     "test_mapping_overrides": { "src/file.ts": ["test/file.test.ts"] }
 *   }
 * }
 */
import type { RepoObservationConfig } from "./types.js";
export type ConfigLoadResult = {
    config: Pick<RepoObservationConfig, "excluded_dirs" | "path_roles" | "test_mapping_overrides">;
    warnings: string[];
    loaded_from: string | null;
};
export declare function loadRepoObservationConfig(repoRoot: string): ConfigLoadResult;
