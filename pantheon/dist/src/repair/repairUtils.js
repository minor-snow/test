import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { normalizeRepoRelativePath } from "../repoObservation/pathUtils.js";
export function deterministicId(prefix, payload) {
    const hash = createHash("sha1")
        .update(JSON.stringify(payload))
        .digest("hex")
        .slice(0, 12);
    return `${prefix}_${hash}`;
}
export function normalizeRepairPath(path) {
    try {
        return normalizeRepoRelativePath(path);
    }
    catch {
        return null;
    }
}
export function pathExistsInRepo(repoRoot, repoPath) {
    const normalized = normalizeRepairPath(repoPath);
    if (!normalized)
        return false;
    return existsSync(join(repoRoot, normalized));
}
export function readJsonFile(path) {
    return JSON.parse(readFileSync(path, "utf-8"));
}
export function uniqueSorted(values) {
    return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}
const globRegexCache = new Map();
export function globToRegex(glob) {
    const cached = globRegexCache.get(glob);
    if (cached)
        return cached;
    const regex = glob
        .replace(/[.+^${}()|[\]\\]/g, "\\$&")
        .replace(/\*\*/g, "___DOUBLESTAR___")
        .replace(/\*/g, "[^/]*")
        .replace(/___DOUBLESTAR___/g, ".*");
    const compiled = new RegExp(`^${regex}$`);
    // Cap cache size to avoid unbounded growth from dynamic patterns
    if (globRegexCache.size < 2000) {
        globRegexCache.set(glob, compiled);
    }
    return compiled;
}
export function matchesPattern(path, pattern) {
    return globToRegex(pattern).test(path);
}
//# sourceMappingURL=repairUtils.js.map