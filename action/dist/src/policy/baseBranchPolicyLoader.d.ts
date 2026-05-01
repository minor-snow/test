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
import type { PolicySource, PolicySourceMode } from "./contractGateTypes.js";
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
/**
 * Load policy from a specific git SHA.
 * Primary path for GitHub PR evaluation.
 */
export declare function loadPolicyFromSha(repoRoot: string, sha: string): BaseBranchPolicyResult;
/**
 * Load policy from local merge-base with main/master.
 * Used for `pantheon-alpha check` without explicit --base.
 */
export declare function loadPolicyFromMergeBase(repoRoot: string): BaseBranchPolicyResult;
/**
 * Load policy from current worktree.
 * Fallback when no git history is available.
 */
export declare function loadPolicyFromWorktree(repoRoot: string): BaseBranchPolicyResult;
/**
 * Unified loader: picks the right strategy based on available context.
 */
export declare function loadBasePolicy(input: {
    repoRoot: string;
    baseSha?: string;
    baseRef?: string;
    policySourceOverride?: PolicySourceMode;
}): BaseBranchPolicyResult;
