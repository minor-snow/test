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
import { DEFAULT_PANTHEON_CONFIG } from "./types.js";
export function loadPantheonConfig(repoRoot, configPathInput = "pantheon.json") {
    const configPath = join(repoRoot, configPathInput);
    const warnings = [];
    if (!existsSync(configPath)) {
        return { config: DEFAULT_PANTHEON_CONFIG, warnings: [], loaded_from: null };
    }
    let raw;
    try {
        raw = JSON.parse(readFileSync(configPath, "utf-8"));
    }
    catch (e) {
        warnings.push(`Failed to parse pantheon.json: ${e.message}`);
        return { config: DEFAULT_PANTHEON_CONFIG, warnings, loaded_from: configPathInput };
    }
    if (typeof raw !== "object" || raw === null) {
        warnings.push("pantheon.json must be a JSON object");
        return { config: DEFAULT_PANTHEON_CONFIG, warnings, loaded_from: configPathInput };
    }
    return parseConfigJson(raw, warnings, configPathInput);
}
/**
 * Generate default pantheon.json content for `pantheon init`.
 */
export function generateDefaultConfigJson() {
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
function parseConfigJson(root, warnings, loadedFrom = "pantheon.json") {
    const version = typeof root.version === "number" ? root.version : 1;
    if (version !== 1) {
        warnings.push(`pantheon.json: unsupported version ${version}, using 1`);
    }
    const protectedList = parseStringArray(root, "protected", warnings);
    const reviewRequired = parseStringArray(root, "review_required", warnings);
    const generated = parseStringArray(root, "generated", warnings);
    const pathRoles = parseStringMap(root, "path_roles", warnings);
    // Python observation config (optional)
    const pythonConfig = parsePythonConfig(root, warnings);
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
function parseStringArray(root, key, warnings) {
    const val = root[key];
    if (val === undefined)
        return [];
    if (!Array.isArray(val)) {
        warnings.push(`pantheon.json: "${key}" must be an array`);
        return [];
    }
    const result = [];
    for (const item of val) {
        if (typeof item === "string" && item.length > 0) {
            result.push(item);
        }
        else {
            warnings.push(`pantheon.json: ${key} contains invalid entry: ${JSON.stringify(item)}`);
        }
    }
    return result;
}
function parseStringMap(root, key, warnings) {
    const val = root[key];
    if (val === undefined)
        return {};
    if (typeof val !== "object" || val === null || Array.isArray(val)) {
        warnings.push(`pantheon.json: "${key}" must be an object`);
        return {};
    }
    const result = {};
    for (const [k, v] of Object.entries(val)) {
        if (typeof v === "string") {
            result[k] = v;
        }
        else {
            warnings.push(`pantheon.json: ${key}["${k}"] must be a string`);
        }
    }
    return result;
}
function parsePythonConfig(root, warnings) {
    const section = root.python;
    if (section === undefined)
        return undefined;
    if (typeof section !== "object" || section === null || Array.isArray(section)) {
        warnings.push('pantheon.json: "python" must be an object');
        return undefined;
    }
    const pyObj = section;
    const result = {};
    // project_packages: string[]
    if (pyObj.project_packages !== undefined) {
        if (Array.isArray(pyObj.project_packages)) {
            const valid = [];
            for (const item of pyObj.project_packages) {
                if (typeof item === "string" && item.length > 0)
                    valid.push(item);
            }
            result.project_packages = valid;
        }
        else {
            warnings.push('pantheon.json: python.project_packages must be an array of strings');
        }
    }
    // sensitive_overrides: Record<string, string>
    if (pyObj.sensitive_overrides !== undefined) {
        if (typeof pyObj.sensitive_overrides === "object" && pyObj.sensitive_overrides !== null && !Array.isArray(pyObj.sensitive_overrides)) {
            const map = {};
            for (const [k, v] of Object.entries(pyObj.sensitive_overrides)) {
                if (typeof v === "string")
                    map[k] = v;
                else
                    warnings.push(`pantheon.json: python.sensitive_overrides["${k}"] must be a string`);
            }
            result.sensitive_overrides = map;
        }
        else {
            warnings.push('pantheon.json: python.sensitive_overrides must be an object');
        }
    }
    return Object.keys(result).length > 0 ? result : undefined;
}
//# sourceMappingURL=pantheonConfig.js.map