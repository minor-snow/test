/**
 * P29.5: Contract Requirement Policy
 *
 * Determines whether a diff REQUIRES a contract based on structural risk.
 * This is a pure function: no git/filesystem access, no side effects.
 *
 * Input: changed file paths + repo observation context.
 * Output: per-file risk classification + overall contract requirement.
 *
 * Risk model:
 *   - Low:      docs-only, comments-only, formatting-only, small test-only → no contract required
 *   - Medium:   source code, non-core modules, minor config → contract required
 *   - High:     auth, payment, security, public API, package.json scripts/exports, workflows → contract required
 *   - Critical: forbidden paths, policy bypass → fail
 *
 * ref: P29.5 section 10
 */
import type { ContractRequirementResult } from "./contractGateTypes.js";
import type { ContractGatePolicyConfig } from "./baseBranchPolicyLoader.js";
export declare function evaluateContractRequirement(input: {
    changedPaths: readonly string[];
    policyConfig?: ContractGatePolicyConfig | null;
    protectedPaths?: readonly string[];
    reviewRequiredPaths?: readonly string[];
    generatedPaths?: readonly string[];
}): ContractRequirementResult;
