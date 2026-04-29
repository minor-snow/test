/**
 * P21: Diff Verifier
 *
 * Checks whether the actual diff stayed inside an AgentScopeLite.
 *
 * It intentionally does not recompute the full ChangeContractLite decision.
 * Keep review-required semantics aligned with:
 *   src/changeContract/lite/changeContractLiteBuilder.ts
 *
 * Source of truth:
 *   - ChangeContractLite builder decides initial bootstrap risk.
 *   - AgentScopeLite carries that risk into agent-facing scope.
 *   - P21 verifier checks actual diff against that scope.
 *
 * For full scope diff validation, see:
 *   src/scopeDiff/scopeDiffValidator.ts (P18)
 */
import type { GitDiffSummary } from "./types.js";
import type { AgentScopeLite, DiffVerificationResult } from "./types.js";
export declare function verifyDiffAgainstScope(input: {
    diff: GitDiffSummary;
    scope: AgentScopeLite;
}): DiffVerificationResult;
