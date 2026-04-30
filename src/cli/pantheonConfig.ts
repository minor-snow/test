/**
 * P24: Pantheon Config Loader
 *
 * Extends existing pantheon.json with P24 public interface fields:
 * protected, review_required, generated, path_roles.
 *
 * Reuses existing repoObservationConfigLoader for path_roles/excluded_dirs.
 * Does NOT use YAML — pantheon.json is the v1 public config.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { PantheonConfig } from "./types.js";
import { DEFAULT_PANTHEON_CONFIG } from "./types.js";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type ConfigLoadResult = {
  readonly config: PantheonConfig;
  readonly warnings: readonly string[];
  readonly loaded_from: string | null;
};

export function loadPantheonConfig(repoRoot: string, configPathInput = "pantheon.json"): ConfigLoadResult {
  const configPath = join(repoRoot, configPathInput);
  const warnings: string[] = [];
  const errors: string[] = [];

  if (!existsSync(configPath)) {
    return { config: DEFAULT_PANTHEON_CONFIG, warnings: [], loaded_from: null };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(configPath, "utf-8"));
  } catch (e) {
    throw new Error(`Failed to parse ${configPathInput}: ${(e as Error).message}`);
  }

  if (typeof raw !== "object" || raw === null) {
    throw new Error(`${configPathInput} must be a JSON object`);
  }

  return parseConfigJson(raw as Record<string, unknown>, warnings, errors, configPathInput);
}

/**
 * Generate default pantheon.json content for `pantheon init`.
 */
export function generateDefaultConfigJson(): string {
  return JSON.stringify({
    version: 1,
    protected: [
      ".pantheon/**",
      ".cursor/**",
      ".git/**",
      "node_modules/**",
    ],
    review_required: [],
    generated: [],
    path_roles: {},
    repo_observation: {},
  }, null, 2) + "\n";
}

// ---------------------------------------------------------------------------
// JSON parser
// ---------------------------------------------------------------------------

function parseConfigJson(
  root: Record<string, unknown>,
  warnings: string[],
  errors: string[],
  loadedFrom = "pantheon.json",
): ConfigLoadResult {
  const version = typeof root.version === "number" ? root.version : 1;
  if (version !== 1) {
    warnings.push(`pantheon.json: unsupported version ${version}, using 1`);
  }

  const protectedList = parseStringArray(root, "protected", warnings, errors);
  const reviewRequired = parseStringArray(root, "review_required", warnings, errors);
  const generated = parseStringArray(root, "generated", warnings, errors);
  const pathRoles = parseStringMap(root, "path_roles", warnings, errors);

  // Python observation config (optional)
  const pythonConfig = parsePythonConfig(root, warnings, errors);

  // Warn on unknown top-level keys
  const knownKeys = new Set([
    "version", "protected", "review_required", "generated",
    "path_roles", "repo_observation", "python",
  ]);
  for (const key of Object.keys(root)) {
    if (!knownKeys.has(key)) {
      warnings.push(`pantheon.json: unknown key "${key}" (ignored)`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`${loadedFrom} is invalid:\n${errors.join("\n")}`);
  }

  const finalProtected = protectedList.length > 0
    ? protectedList
    : [...DEFAULT_PANTHEON_CONFIG.protected];

  return {
    config: {
      version: 1,
      protected: finalProtected,
      review_required: reviewRequired,
      generated,
      path_roles: pathRoles,
      python: pythonConfig,
    },
    warnings,
    loaded_from: loadedFrom,
  };
}

function parseStringArray(
  root: Record<string, unknown>,
  key: string,
  warnings: string[],
  errors: string[],
): string[] {
  const val = root[key];
  if (val === undefined) return [];
  if (!Array.isArray(val)) {
    errors.push(`pantheon.json: "${key}" must be an array`);
    return [];
  }
  const result: string[] = [];
  for (const item of val) {
    if (typeof item === "string" && item.length > 0) {
      result.push(item);
    } else {
      errors.push(`pantheon.json: ${key} contains invalid entry: ${JSON.stringify(item)}`);
    }
  }
  return result;
}

function parseStringMap(
  root: Record<string, unknown>,
  key: string,
  warnings: string[],
  errors: string[],
): Record<string, string> {
  const val = root[key];
  if (val === undefined) return {};
  if (typeof val !== "object" || val === null || Array.isArray(val)) {
    errors.push(`pantheon.json: "${key}" must be an object`);
    return {};
  }
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
    if (typeof v === "string") {
      result[k] = v;
    } else {
      errors.push(`pantheon.json: ${key}["${k}"] must be a string`);
    }
  }
  return result;
}

function parsePythonConfig(
  root: Record<string, unknown>,
  warnings: string[],
  errors: string[],
): { project_packages?: string[]; sensitive_overrides?: Record<string, string> } | undefined {
  const section = root.python;
  if (section === undefined) return undefined;
  if (typeof section !== "object" || section === null || Array.isArray(section)) {
    errors.push('pantheon.json: "python" must be an object');
    return undefined;
  }

  const pyObj = section as Record<string, unknown>;
  const result: { project_packages?: string[]; sensitive_overrides?: Record<string, string> } = {};

  // project_packages: string[]
  if (pyObj.project_packages !== undefined) {
    if (Array.isArray(pyObj.project_packages)) {
      const valid: string[] = [];
      for (const item of pyObj.project_packages) {
        if (typeof item === "string" && item.length > 0) valid.push(item);
        else errors.push(`pantheon.json: python.project_packages contains invalid entry: ${JSON.stringify(item)}`);
      }
      result.project_packages = valid;
    } else {
      errors.push('pantheon.json: python.project_packages must be an array of strings');
    }
  }

  // sensitive_overrides: Record<string, string>
  if (pyObj.sensitive_overrides !== undefined) {
    if (typeof pyObj.sensitive_overrides === "object" && pyObj.sensitive_overrides !== null && !Array.isArray(pyObj.sensitive_overrides)) {
      const map: Record<string, string> = {};
      for (const [k, v] of Object.entries(pyObj.sensitive_overrides as Record<string, unknown>)) {
        if (typeof v === "string") map[k] = v;
        else errors.push(`pantheon.json: python.sensitive_overrides["${k}"] must be a string`);
      }
      result.sensitive_overrides = map;
    } else {
      errors.push('pantheon.json: python.sensitive_overrides must be an object');
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}
