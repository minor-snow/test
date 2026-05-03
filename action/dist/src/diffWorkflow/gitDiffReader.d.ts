/**
 * P21: Git Diff Reader
 *
 * Reads changed files from git diff + untracked files.
 * Falls back gracefully when not in a git repo.
 *
 * Does NOT parse patch content — only file paths and status.
 */
import type { GitDiffSummary } from "./types.js";
/**
 * Read changed files from git diff + untracked files.
 *
 * If `changedFilesOverride` is provided, it takes precedence over git.
 */
export declare function readGitDiffSummary(input: {
    repoRoot: string;
    baseRef: string;
    changedFilesOverride?: string[];
}): GitDiffSummary;
/**
 * Extract just the file paths from a GitDiffSummary.
 */
export declare function extractChangedFilePaths(diff: GitDiffSummary): string[];
