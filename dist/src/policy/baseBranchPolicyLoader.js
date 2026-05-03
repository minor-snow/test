/**
 * P29.5: Base Branch Policy Loader
 *
 * Reads Pantheon configuration from a specific git SHA (base branch),
 * ensuring PR-modified policy does not influence evaluation of the PR itself.
 *
 * Invariant: Policy changes in a PR are the SUBJECT of review, not the RULESET.
 *
 * Supports:
 *   - GitHub PR mode: reads from PR base SHA via `git show`
 *   - Local mode: resolves merge-base with main/master
 *   - Fallback: current worktree (marked as such)
 *   - Missing policy: fail-closed with conservative defaults
 *
 * ref: P29.5 INV-2, INV-3
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
// ---------------------------------------------------------------------------
// Config file names to try (in order)
// ---------------------------------------------------------------------------
const CONFIG_FILE_CANDIDATES = [
    "pantheon.alpha.json",
    "pantheon.json",
    "pantheon.agent.json",
];
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
/**
 * Load policy from a specific git SHA.
 * Primary path for GitHub PR evaluation.
 */
export function loadPolicyFromSha(repoRoot, sha) {
    for (const configFile of CONFIG_FILE_CANDIDATES) {
        const raw = gitShowFile(repoRoot, sha, configFile);
        if (raw !== null) {
            return parseRawPolicy(raw, "base_branch", sha);
        }
    }
    // No config file found at base SHA — fail-closed with conservative defaults
    return {
        source: {
            mode: "base_branch",
            status: "missing",
            base_sha: sha,
        },
        config: null,
    };
}
/**
 * Load policy from local merge-base with main/master.
 * Used for `pantheon-alpha check` without explicit --base.
 */
export function loadPolicyFromMergeBase(repoRoot) {
    const mergeBaseSha = resolveMergeBase(repoRoot);
    if (mergeBaseSha) {
        return loadPolicyFromSha(repoRoot, mergeBaseSha);
    }
    // No merge-base available — fall back to current worktree
    return loadPolicyFromWorktree(repoRoot);
}
/**
 * Load policy from current worktree.
 * Fallback when no git history is available.
 */
export function loadPolicyFromWorktree(repoRoot) {
    for (const configFile of CONFIG_FILE_CANDIDATES) {
        const filePath = join(repoRoot, configFile);
        if (existsSync(filePath)) {
            try {
                const raw = readFileSync(filePath, "utf-8");
                return parseRawPolicy(raw, "current_worktree");
            }
            catch {
                // Continue to next candidate
            }
        }
    }
    return {
        source: {
            mode: "current_worktree",
            status: "missing",
        },
        config: null,
    };
}
/**
 * Unified loader: picks the right strategy based on available context.
 */
export function loadBasePolicy(input) {
    const { repoRoot, baseSha, baseRef, policySourceOverride } = input;
    // Explicit override
    if (policySourceOverride === "current_worktree") {
        return loadPolicyFromWorktree(repoRoot);
    }
    // Explicit base SHA (GitHub PR mode)
    if (baseSha) {
        return loadPolicyFromSha(repoRoot, baseSha);
    }
    // Explicit base ref
    if (baseRef) {
        const resolved = resolveRef(repoRoot, baseRef);
        if (resolved) {
            return loadPolicyFromSha(repoRoot, resolved);
        }
    }
    // Auto-detect merge-base
    return loadPolicyFromMergeBase(repoRoot);
}
// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------
function parseRawPolicy(raw, mode, sha) {
    try {
        const parsed = JSON.parse(raw);
        return {
            source: {
                mode,
                status: "loaded",
                base_sha: sha,
            },
            config: parsed,
            raw,
        };
    }
    catch {
        return {
            source: {
                mode,
                status: "parse_error",
                base_sha: sha,
            },
            config: null,
            raw,
        };
    }
}
function gitShowFile(repoRoot, sha, filePath) {
    try {
        const result = execSync(`git show ${sha}:${filePath}`, {
            cwd: repoRoot,
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "pipe"],
            timeout: 5000,
        });
        return result;
    }
    catch {
        return null;
    }
}
function resolveMergeBase(repoRoot) {
    for (const upstream of ["main", "master"]) {
        try {
            const result = execSync(`git merge-base HEAD ${upstream}`, {
                cwd: repoRoot,
                encoding: "utf-8",
                stdio: ["pipe", "pipe", "pipe"],
                timeout: 5000,
            });
            return result.trim();
        }
        catch {
            // Try next upstream
        }
    }
    return null;
}
function resolveRef(repoRoot, ref) {
    try {
        const result = execSync(`git rev-parse ${ref}`, {
            cwd: repoRoot,
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "pipe"],
            timeout: 5000,
        });
        return result.trim();
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=baseBranchPolicyLoader.js.map