import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { shortStableId } from "../deterministic.js";
import { globToRegex as sharedGlobToRegex, matchesGlob } from "../globMatch.js";
import { normalizeRepoRelativePath } from "../repoObservation/pathUtils.js";
export function deterministicId(prefix, payload) {
    return shortStableId(prefix, payload, 16);
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
    try {
        return JSON.parse(readFileSync(path, "utf-8"));
    }
    catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to read JSON file ${path}: ${reason}`);
    }
}
export function uniqueSorted(values) {
    return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}
export function globToRegex(glob) {
    return sharedGlobToRegex(glob);
}
export function matchesPattern(path, pattern) {
    // Handle special TS/JS config brace expansion which basic globMatch doesn't support
    if (pattern === "tsconfig*.json|*.config.{ts,js}") {
        return /^tsconfig(\.\w+)?\.json$/.test(path) || /\.config\.(ts|js|mjs|cjs)$/.test(path);
    }
    // Support | operator for multiple globs
    return pattern.split("|").some(p => matchesGlob(path, p));
}
//# sourceMappingURL=repairUtils.js.map