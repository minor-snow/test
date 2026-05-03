/**
 * P29.5: Contract Gate Evaluator
 *
 * Top-level orchestrator for the Contract Required Gate.
 * Composes all P29.5 modules into a single deterministic evaluation pipeline:
 *
 *   1. Load base-branch policy
 *   2. Detect policy tamper
 *   3. Guard PR-authored artifacts
 *   4. Evaluate contract requirement (risk classification)
 *   5. Resolve active contract
 *   6. Resolve trusted approval (if provided)
 *   7. Produce ContractGateResult with verdict, findings, and required actions
 *
 * Verdict precedence:
 *   fail > requires_replan > requires_contract > requires_review > pass
 *
 * The gate evaluator runs BEFORE the existing repair/change pipeline.
 * If verdict is fail/requires_contract/requires_replan, the pipeline short-circuits.
 * If verdict is pass/requires_review, the existing pipeline continues.
 * The final public verdict = max(gate verdict, pipeline verdict).
 *
 * ref: P29.5 section 4, implementation plan
 */
import type { ContractGateResult, TrustedApprovalSummary } from "./contractGateTypes.js";
import type { PolicySourceMode } from "./contractGateTypes.js";
export type ContractGateInput = {
    readonly repoRoot: string;
    readonly changedPaths: readonly string[];
    readonly baseSha?: string;
    readonly baseRef?: string;
    readonly policySourceOverride?: PolicySourceMode;
    readonly trustedApproval?: TrustedApprovalSummary;
};
export declare function evaluateContractGate(input: ContractGateInput): ContractGateResult;
