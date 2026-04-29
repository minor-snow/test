/**
 * P24: Artifact Layout
 *
 * Canonical .pantheon/ directory structure.
 * Public artifacts go in .pantheon/ root.
 * Internal machine objects go in .pantheon/internal/.
 */
import { join } from "node:path";
import { mkdirSync } from "node:fs";
const PANTHEON_DIR = ".pantheon";
const INTERNAL_DIR = "internal";
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export function resolvePantheonDir(repoRoot) {
    return join(repoRoot, PANTHEON_DIR);
}
export function ensurePantheonDirs(repoRoot) {
    const pantheonDir = resolvePantheonDir(repoRoot);
    mkdirSync(pantheonDir, { recursive: true });
    mkdirSync(join(pantheonDir, INTERNAL_DIR), { recursive: true });
}
export function publicPaths(repoRoot) {
    const dir = resolvePantheonDir(repoRoot);
    return {
        dir,
        task: join(dir, "task.md"),
        scope: join(dir, "scope.md"),
        report: join(dir, "report.md"),
        feedback: join(dir, "feedback.md"),
        check: join(dir, "check.json"),
    };
}
export function internalPaths(repoRoot) {
    const dir = join(resolvePantheonDir(repoRoot), INTERNAL_DIR);
    return {
        dir,
        observations: join(dir, "observations.json"),
        contract: join(dir, "change_contract_lite.json"),
        scope: join(dir, "agent_scope.json"),
        verification: join(dir, "diff_verification.json"),
        feedback: join(dir, "agent_feedback.json"),
    };
}
/**
 * Relative path from repo root for display purposes.
 */
export function relativePantheonPath(fullPath, repoRoot) {
    let prefix = join(repoRoot, "").replace(/\\/g, "/");
    if (!prefix.endsWith("/"))
        prefix += "/";
    const normalized = fullPath.replace(/\\/g, "/");
    if (normalized.startsWith(prefix)) {
        return normalized.slice(prefix.length);
    }
    return normalized;
}
//# sourceMappingURL=artifactLayout.js.map