import type { ChangeCheckVerdict } from "../change/types.js";
import type { RepairVerdict } from "../repair/types.js";
import type { GitHubExitDecision, GitHubFailCondition } from "./githubActionTypes.js";
/**
 * Unified exit policy for all Pantheon GitHub Action modes.
 *
 * Enforces consistency across Boundary, Repair, and Change modes:
 * - 'pass' -> Always Exit 0
 * - 'requires_review' -> Exit 0 by default, Exit 1 if fail_on='all'
 * - 'fail', 'requires_contract', 'requires_replan', 'requires_scope_expansion' -> Exit 1 by default
 */
export declare function decideGitHubActionExit(input: {
    /** @deprecated use verdict directly */
    readonly check?: {
        verdict: string;
        findings: any[];
    };
    readonly verdict?: ChangeCheckVerdict | RepairVerdict | string;
    readonly sanitizerViolations?: number;
    readonly failOn: readonly GitHubFailCondition[];
}): GitHubExitDecision;
/** @deprecated use decideGitHubActionExit */
export declare const decideGitHubRepairExit: typeof decideGitHubActionExit;
