/**
 * P20a: Repo-relative Path Utilities
 *
 * Core invariant: All emitted paths in RepoObservations must be
 * repo-relative, POSIX-style, with no absolute prefix and no
 * escaping `..` segments.
 */
// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------
/**
 * Normalize a raw path to a repo-relative POSIX path.
 *
 * Converts backslashes to forward slashes, removes leading `./`,
 * collapses repeated slashes, and rejects invalid paths.
 *
 * @throws Error if path is empty, absolute, or escapes the repo root via `..`
 */
export function normalizeRepoRelativePath(input) {
    if (!input || input.trim().length === 0) {
        throw new Error("Path must not be empty");
    }
    // Convert backslashes to forward slashes
    let normalized = input.replace(/\\/g, "/");
    // Collapse repeated slashes
    normalized = normalized.replace(/\/+/g, "/");
    // Remove trailing slash (unless it's the only character)
    if (normalized.length > 1 && normalized.endsWith("/")) {
        normalized = normalized.slice(0, -1);
    }
    // Remove leading ./
    while (normalized.startsWith("./")) {
        normalized = normalized.slice(2);
    }
    // Reject absolute paths (Unix or Windows-style)
    if (normalized.startsWith("/") || /^[A-Za-z]:/.test(normalized)) {
        throw new Error(`Path must not be absolute: ${input}`);
    }
    // Reject paths that escape the repo root
    if (pathEscapesRepo(normalized)) {
        throw new Error(`Path must not escape repo root via '..': ${input}`);
    }
    if (normalized.length === 0) {
        throw new Error("Path must not be empty after normalization");
    }
    return normalized;
}
// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
/**
 * Check if a path is a valid repo-relative POSIX path.
 *
 * Returns true if the path:
 *   - is non-empty
 *   - is not absolute
 *   - does not escape the repo root via `..`
 *   - uses forward slashes only
 */
export function isRepoRelativePath(input) {
    if (!input || input.trim().length === 0) {
        return false;
    }
    // Contains backslashes
    if (input.includes("\\")) {
        return false;
    }
    // Absolute path
    if (input.startsWith("/") || /^[A-Za-z]:/.test(input)) {
        return false;
    }
    // Escaping ..
    if (pathEscapesRepo(input)) {
        return false;
    }
    // Repeated slashes
    if (/\/\//.test(input)) {
        return false;
    }
    // Leading ./
    if (input.startsWith("./")) {
        return false;
    }
    return input.length > 0;
}
// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------
/**
 * Determine if a forward-slash path escapes the repo root via `..`.
 *
 * A path escapes if at any point the depth goes negative when
 * walking segments left-to-right. Handles both `../foo` and
 * `foo/../../bar` patterns.
 */
function pathEscapesRepo(normalized) {
    const segments = normalized.split("/");
    let depth = 0;
    for (const seg of segments) {
        if (seg === "..") {
            depth--;
            if (depth < 0)
                return true;
        }
        else if (seg !== "" && seg !== ".") {
            depth++;
        }
    }
    return false;
}
//# sourceMappingURL=pathUtils.js.map