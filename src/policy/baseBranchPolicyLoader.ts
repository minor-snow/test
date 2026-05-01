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
import type { PolicySource, PolicySourceMode, PolicySourceStatus } from "./contractGateTypes.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BaseBranchPolicyResult = {
  readonly source: PolicySource;
  readonly config: BasePolicyConfig | null;
  readonly raw?: string;
};

/**
 * Minimal policy fields needed by the contract gate.
 * This is a subset — we don't import the full PantheonConfig type
 * to avoid circular dependencies with the CLI layer.
 */
export type BasePolicyConfig = {
  readonly protected?: readonly string[];
  readonly review_required?: readonly string[];
  readonly generated?: readonly string[];
  readonly contract_gate?: ContractGatePolicyConfig;
};

export type ContractGatePolicyConfig = {
  readonly enabled?: boolean;
  readonly default_mode?: "risk_based" | "strict" | "off";
  readonly risk_threshold_for_contract?: "low" | "medium" | "high";
  readonly low_risk_bypass?: {
    readonly enabled?: boolean;
    readonly docs_only?: boolean;
    readonly comments_only?: boolean;
    readonly formatting_only?: boolean;
    readonly test_only?: "allow_low_risk" | "require_review" | "require_contract";
  };
  readonly protected_policy_paths?: readonly string[];
  readonly contract_artifact_paths?: readonly string[];
  readonly trusted_approval?: {
    readonly github_reviews?: boolean;
    readonly codeowners?: boolean;
    readonly allowed_labels?: readonly string[];
    readonly require_write_permission?: boolean;
  };
};

// ---------------------------------------------------------------------------
// Config file names to try (in order)
// ---------------------------------------------------------------------------

const CONFIG_FILE_CANDIDATES = [
  "pantheon.alpha.json",
  "pantheon.json",
  "pantheon.agent.json",
] as const;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Load policy from a specific git SHA.
 * Primary path for GitHub PR evaluation.
 */
export function loadPolicyFromSha(repoRoot: string, sha: string): BaseBranchPolicyResult {
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
export function loadPolicyFromMergeBase(repoRoot: string): BaseBranchPolicyResult {
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
export function loadPolicyFromWorktree(repoRoot: string): BaseBranchPolicyResult {
  for (const configFile of CONFIG_FILE_CANDIDATES) {
    const filePath = join(repoRoot, configFile);
    if (existsSync(filePath)) {
      try {
        const raw = readFileSync(filePath, "utf-8");
        return parseRawPolicy(raw, "current_worktree");
      } catch {
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
export function loadBasePolicy(input: {
  repoRoot: string;
  baseSha?: string;
  baseRef?: string;
  policySourceOverride?: PolicySourceMode;
}): BaseBranchPolicyResult {
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

function parseRawPolicy(
  raw: string,
  mode: PolicySourceMode,
  sha?: string,
): BaseBranchPolicyResult {
  try {
    const parsed = JSON.parse(raw) as BasePolicyConfig;
    return {
      source: {
        mode,
        status: "loaded",
        base_sha: sha,
      },
      config: parsed,
      raw,
    };
  } catch {
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

function gitShowFile(repoRoot: string, sha: string, filePath: string): string | null {
  try {
    const result = execSync(`git show ${sha}:${filePath}`, {
      cwd: repoRoot,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 5000,
    });
    return result;
  } catch {
    return null;
  }
}

function resolveMergeBase(repoRoot: string): string | null {
  for (const upstream of ["main", "master"]) {
    try {
      const result = execSync(`git merge-base HEAD ${upstream}`, {
        cwd: repoRoot,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
        timeout: 5000,
      });
      return result.trim();
    } catch {
      // Try next upstream
    }
  }
  return null;
}

function resolveRef(repoRoot: string, ref: string): string | null {
  try {
    const result = execSync(`git rev-parse ${ref}`, {
      cwd: repoRoot,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 5000,
    });
    return result.trim();
  } catch {
    return null;
  }
}
