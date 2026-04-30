import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { shortStableId } from "../deterministic.js";
import { globToRegex as sharedGlobToRegex, matchesGlob } from "../globMatch.js";
import { normalizeRepoRelativePath } from "../repoObservation/pathUtils.js";

export function deterministicId(prefix: string, payload: unknown): string {
  return shortStableId(prefix, payload, 16);
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
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as T;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read JSON file ${path}: ${reason}`);
  }
}

export function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

export function globToRegex(glob: string): RegExp {
  return sharedGlobToRegex(glob);
}

export function matchesPattern(path: string, pattern: string): boolean {
  return matchesGlob(path, pattern);
}
