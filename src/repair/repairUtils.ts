import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { normalizeRepoRelativePath } from "../repoObservation/pathUtils.js";

export function deterministicId(prefix: string, payload: unknown): string {
  const hash = createHash("sha1")
    .update(JSON.stringify(payload))
    .digest("hex")
    .slice(0, 12);
  return `${prefix}_${hash}`;
}

export function normalizeRepairPath(path: string): string | null {
  try {
    return normalizeRepoRelativePath(path);
  } catch {
    return null;
  }
}

export function pathExistsInRepo(repoRoot: string, repoPath: string): boolean {
  const normalized = normalizeRepairPath(repoPath);
  if (!normalized) return false;
  return existsSync(join(repoRoot, normalized));
}

export function readJsonFile<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

export function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

const globRegexCache = new Map<string, RegExp>();

export function globToRegex(glob: string): RegExp {
  const cached = globRegexCache.get(glob);
  if (cached) return cached;
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

export function matchesPattern(path: string, pattern: string): boolean {
  return globToRegex(pattern).test(path);
}
