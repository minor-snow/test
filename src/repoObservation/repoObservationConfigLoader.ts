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
import type { FileBucket, RepoObservationConfig } from "./types.js";

const VALID_BUCKETS = new Set<FileBucket>([
  "src", "test", "config", "generated", "docs", "script", "asset", "unknown",
]);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type ConfigLoadResult = {
  config: Pick<RepoObservationConfig, "excluded_dirs" | "path_roles" | "test_mapping_overrides">;
  warnings: string[];
  loaded_from: string | null;
};

export function loadRepoObservationConfig(repoRoot: string): ConfigLoadResult {
  const warnings: string[] = [];

  const configPath = join(repoRoot, "pantheon.json");
  if (!existsSync(configPath)) {
    return {
      config: {},
      warnings: [],
      loaded_from: null,
    };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(configPath, "utf-8"));
  } catch (e) {
    warnings.push(`Failed to parse pantheon.json: ${(e as Error).message}`);
    return { config: {}, warnings, loaded_from: "pantheon.json" };
  }

  if (typeof raw !== "object" || raw === null) {
    warnings.push("pantheon.json must be a JSON object");
    return { config: {}, warnings, loaded_from: "pantheon.json" };
  }

  const root = raw as Record<string, unknown>;
  const repoObs = root["repo_observation"];
  if (repoObs === undefined) {
    return { config: {}, warnings: [], loaded_from: "pantheon.json" };
  }

  if (typeof repoObs !== "object" || repoObs === null) {
    warnings.push("pantheon.json: repo_observation must be an object");
    return { config: {}, warnings, loaded_from: "pantheon.json" };
  }

  const section = repoObs as Record<string, unknown>;

  // Parse excluded_dirs
  let excluded_dirs: string[] | undefined;
  if (section["excluded_dirs"] !== undefined) {
    if (Array.isArray(section["excluded_dirs"])) {
      excluded_dirs = [];
      for (const item of section["excluded_dirs"]) {
        if (typeof item === "string" && item.length > 0) {
          excluded_dirs.push(item);
        } else {
          warnings.push(`pantheon.json: excluded_dirs contains invalid entry: ${JSON.stringify(item)}`);
        }
      }
    } else {
      warnings.push("pantheon.json: excluded_dirs must be an array");
    }
  }

  // Parse path_roles
  let path_roles: Record<string, FileBucket> | undefined;
  if (section["path_roles"] !== undefined) {
    if (typeof section["path_roles"] === "object" && section["path_roles"] !== null && !Array.isArray(section["path_roles"])) {
      path_roles = {};
      for (const [key, value] of Object.entries(section["path_roles"] as Record<string, unknown>)) {
        if (typeof value === "string" && VALID_BUCKETS.has(value as FileBucket)) {
          path_roles[key] = value as FileBucket;
        } else {
          warnings.push(`pantheon.json: path_roles["${key}"] has invalid bucket: ${JSON.stringify(value)}`);
        }
      }
    } else {
      warnings.push("pantheon.json: path_roles must be an object");
    }
  }

  // Parse test_mapping_overrides
  let test_mapping_overrides: Record<string, string[]> | undefined;
  if (section["test_mapping_overrides"] !== undefined) {
    if (typeof section["test_mapping_overrides"] === "object" && section["test_mapping_overrides"] !== null && !Array.isArray(section["test_mapping_overrides"])) {
      test_mapping_overrides = {};
      for (const [key, value] of Object.entries(section["test_mapping_overrides"] as Record<string, unknown>)) {
        if (Array.isArray(value) && value.every(v => typeof v === "string")) {
          test_mapping_overrides[key] = value as string[];
        } else {
          warnings.push(`pantheon.json: test_mapping_overrides["${key}"] must be an array of strings`);
        }
      }
    } else {
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
