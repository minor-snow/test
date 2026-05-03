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
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
const VALID_BUCKETS = new Set([
    "src", "test", "config", "generated", "docs", "script", "asset", "unknown",
]);
export function loadRepoObservationConfig(repoRoot) {
    const warnings = [];
    const configPath = join(repoRoot, "pantheon.json");
    if (!existsSync(configPath)) {
        return {
            config: {},
            warnings: [],
            loaded_from: null,
        };
    }
    let raw;
    try {
        raw = JSON.parse(readFileSync(configPath, "utf-8"));
    }
    catch (e) {
        warnings.push(`Failed to parse pantheon.json: ${e.message}`);
        return { config: {}, warnings, loaded_from: "pantheon.json" };
    }
    if (typeof raw !== "object" || raw === null) {
        warnings.push("pantheon.json must be a JSON object");
        return { config: {}, warnings, loaded_from: "pantheon.json" };
    }
    const root = raw;
    const repoObs = root["repo_observation"];
    if (repoObs === undefined) {
        return { config: {}, warnings: [], loaded_from: "pantheon.json" };
    }
    if (typeof repoObs !== "object" || repoObs === null) {
        warnings.push("pantheon.json: repo_observation must be an object");
        return { config: {}, warnings, loaded_from: "pantheon.json" };
    }
    const section = repoObs;
    // Parse excluded_dirs
    let excluded_dirs;
    if (section["excluded_dirs"] !== undefined) {
        if (Array.isArray(section["excluded_dirs"])) {
            excluded_dirs = [];
            for (const item of section["excluded_dirs"]) {
                if (typeof item === "string" && item.length > 0) {
                    excluded_dirs.push(item);
                }
                else {
                    warnings.push(`pantheon.json: excluded_dirs contains invalid entry: ${JSON.stringify(item)}`);
                }
            }
        }
        else {
            warnings.push("pantheon.json: excluded_dirs must be an array");
        }
    }
    // Parse path_roles
    let path_roles;
    if (section["path_roles"] !== undefined) {
        if (typeof section["path_roles"] === "object" && section["path_roles"] !== null && !Array.isArray(section["path_roles"])) {
            path_roles = {};
            for (const [key, value] of Object.entries(section["path_roles"])) {
                if (typeof value === "string" && VALID_BUCKETS.has(value)) {
                    path_roles[key] = value;
                }
                else {
                    warnings.push(`pantheon.json: path_roles["${key}"] has invalid bucket: ${JSON.stringify(value)}`);
                }
            }
        }
        else {
            warnings.push("pantheon.json: path_roles must be an object");
        }
    }
    // Parse test_mapping_overrides
    let test_mapping_overrides;
    if (section["test_mapping_overrides"] !== undefined) {
        if (typeof section["test_mapping_overrides"] === "object" && section["test_mapping_overrides"] !== null && !Array.isArray(section["test_mapping_overrides"])) {
            test_mapping_overrides = {};
            for (const [key, value] of Object.entries(section["test_mapping_overrides"])) {
                if (Array.isArray(value) && value.every(v => typeof v === "string")) {
                    test_mapping_overrides[key] = value;
                }
                else {
                    warnings.push(`pantheon.json: test_mapping_overrides["${key}"] must be an array of strings`);
                }
            }
        }
        else {
            warnings.push("pantheon.json: test_mapping_overrides must be an object");
        }
    }
    return {
        config: {
            ...(excluded_dirs !== undefined ? { excluded_dirs } : {}),
            ...(path_roles !== undefined ? { path_roles } : {}),
            ...(test_mapping_overrides !== undefined ? { test_mapping_overrides } : {}),
        },
        warnings,
        loaded_from: "pantheon.json",
    };
}
//# sourceMappingURL=repoObservationConfigLoader.js.map