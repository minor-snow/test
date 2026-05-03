/**
 * P29.5: Policy Tamper Detector
 *
 * Detects when a diff touches governance-sensitive files.
 * These files define Pantheon's enforcement rules, workflows,
 * or artifact trust boundaries.
 *
 * When tamper is detected:
 *   - The base-branch policy is used for evaluation (not the modified version).
 *   - A finding is emitted for human review.
 *   - The verdict escalates to at least `requires_review`.
 *
 * Checks both ADDED and MODIFIED files (implementation guard #4).
 *
 * ref: P29.5 INV-3, section 8
 */
import type { PolicyTamperResult } from "./contractGateTypes.js";
/**
 * Detect policy tamper in a set of changed file paths.
 *
 * @param changedPaths - Repo-relative paths of all files in the diff (added, modified, deleted).
 * @param overrides - Optional custom patterns (from contract_gate config).
 */
export declare function detectPolicyTamper(changedPaths: readonly string[], overrides?: {
    protectedPolicyPaths?: readonly string[];
    contractArtifactPaths?: readonly string[];
}): PolicyTamperResult;
/**
 * Returns only the policy-sensitive findings (not workflow/artifact).
 * Used to determine if base-branch policy evaluation is mandatory.
 */
export declare function hasPolicySensitiveChanges(result: PolicyTamperResult): boolean;
/**
 * Returns only the approval-artifact findings.
 * Used by prAuthoredArtifactGuard for trust evaluation.
 */
export declare function hasApprovalArtifactChanges(result: PolicyTamperResult): boolean;
/**
 * Returns only the contract-artifact findings.
 * Used to detect PR-authored contract modifications.
 */
export declare function hasContractArtifactChanges(result: PolicyTamperResult): boolean;
