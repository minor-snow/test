/**
 * P21: Git Diff Reader
 *
 * Reads changed files from git diff + untracked files.
 * Falls back gracefully when not in a git repo.
 *
 * Does NOT parse patch content — only file paths and status.
 */

import { execSync } from "node:child_process";
import { normalizeRepoRelativePath } from "../repoObservation/pathUtils.js";
import type { GitDiffSummary, GitDiffFile, GitDiffFileStatus } from "./types.js";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Read changed files from git diff + untracked files.
 *
 * If `changedFilesOverride` is provided, it takes precedence over git.
 */
export function readGitDiffSummary(input: {
  repoRoot: string;
  baseRef: string;
  changedFilesOverride?: string[];
}): GitDiffSummary {
  const { repoRoot, baseRef, changedFilesOverride } = input;

  // Override takes precedence
  if (changedFilesOverride && changedFilesOverride.length > 0) {
    return {
      base_ref: baseRef,
      changed_files: changedFilesOverride.map(p => ({
        path: normalizePath(p),
        status: "modified" as GitDiffFileStatus,
      })),
      warnings: [],
    };
  }

  const warnings: string[] = [];
  const files: GitDiffFile[] = [];

  // 1. Read name-status diff
  try {
    const nameStatus = execSync(`git diff --name-status ${baseRef}`, {
      cwd: repoRoot,
      encoding: "utf-8",
      timeout: 10_000,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();

    if (nameStatus) {
      for (const line of nameStatus.split("\n")) {
        const parsed = parseNameStatusLine(line.trim());
        if (parsed) {
          files.push(parsed);
        } else if (line.trim()) {
          warnings.push(`Could not parse git diff line: ${line.trim()}`);
        }
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("not a git repository") || msg.includes("Not a git repository")) {
      warnings.push(`Not a git repository. Use --changed to specify files manually.`);
    } else {
      warnings.push(`git diff failed: ${msg}`);
    }
    return { base_ref: baseRef, changed_files: [], warnings };
  }

  // 2. Read untracked files only for working-tree mode.
  // In CI / PR mode with an explicit base ref, the diff must reflect base..HEAD
  // only and should not be polluted by local bootstrap artifacts like node_modules/.
  if (!baseRef) {
    try {
      const untracked = execSync("git ls-files --others --exclude-standard", {
        cwd: repoRoot,
        encoding: "utf-8",
        timeout: 10_000,
        stdio: ["pipe", "pipe", "pipe"],
      }).trim();

      if (untracked) {
        for (const path of untracked.split("\n")) {
          const trimmed = path.trim();
          if (trimmed) {
            files.push({ path: normalizePath(trimmed), status: "untracked" });
          }
        }
      }
    } catch (e) {
      warnings.push(`git ls-files failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { base_ref: baseRef, changed_files: files, warnings };
}

/**
 * Extract just the file paths from a GitDiffSummary.
 */
export function extractChangedFilePaths(diff: GitDiffSummary): string[] {
  return diff.changed_files.map(f => f.path);
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

const STATUS_MAP: Record<string, GitDiffFileStatus> = {
  A: "added",
  M: "modified",
  D: "deleted",
  R: "renamed",
  C: "modified", // copied — treat as modified
  T: "modified", // type change
};

function parseNameStatusLine(line: string): GitDiffFile | null {
  if (!line) return null;

  // Format: "M\tpath" or "R100\told_path\tnew_path"
  const parts = line.split("\t");
  if (parts.length < 2) return null;

  const statusCode = parts[0].charAt(0).toUpperCase();
  const status = STATUS_MAP[statusCode] ?? "unknown";

  if (statusCode === "R" && parts.length >= 3) {
    return {
      path: normalizePath(parts[2]),
      status: "renamed",
      old_path: normalizePath(parts[1]),
    };
  }

  return { path: normalizePath(parts[1]), status };
}

function normalizePath(p: string): string {
  try {
    return normalizeRepoRelativePath(p);
  } catch {
    return p.replace(/\\/g, "/");
  }
}
