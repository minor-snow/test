/**
 * P20a: Repo-relative Path Utilities
 *
 * Core invariant: All emitted paths in RepoObservations must be
 * repo-relative, POSIX-style, with no absolute prefix and no
 * escaping `..` segments.
 */
/**
 * Normalize a raw path to a repo-relative POSIX path.
 *
 * Converts backslashes to forward slashes, removes leading `./`,
 * collapses repeated slashes, and rejects invalid paths.
 *
 * @throws Error if path is empty, absolute, or escapes the repo root via `..`
 */
export declare function normalizeRepoRelativePath(input: string): string;
/**
 * Check if a path is a valid repo-relative POSIX path.
 *
 * Returns true if the path:
 *   - is non-empty
 *   - is not absolute
 *   - does not escape the repo root via `..`
 *   - uses forward slashes only
 */
export declare function isRepoRelativePath(input: string): boolean;
