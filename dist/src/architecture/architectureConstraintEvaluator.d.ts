/**
 * P30: Architecture Constraint Evaluator
 *
 * Given a set of changed files and an architecture contract, produces
 * ArchitectureFinding[] that are fed into the change/repair verifier.
 *
 * Key behaviors:
 * - Global constraints (forbidden/review) apply to all changes
 * - Contextual ownership constraints detect scope crossings
 * - must_not_depend_on detects when both sides of a boundary are touched
 * - Advisory relations produce info-level findings, never blocking
 * - architecture_contract.json modification is always flagged
 *
 * WORDING INVARIANT (must_not_depend_on):
 *   Never say "X depends on Y."
 *   Say "This diff touches both sides of a must-not-depend boundary."
 *   P30 has no import graph to prove real dependency violations.
 *
 * ref: P30
 */
import type { ArchitectureContract, ArchitectureFinding } from "./types.js";
export type ArchitectureEvaluationInput = {
    /** The active architecture contract (from base branch for PRs) */
    readonly contract: ArchitectureContract;
    /** Changed file paths (repo-relative POSIX) */
    readonly changedFiles: readonly string[];
    /** Declared change/repair target subjects */
    readonly targetSubjects: readonly string[];
    /** Whether the architecture_contract.json itself was modified in the diff */
    readonly architectureContractModified: boolean;
};
export type ArchitectureEvaluationResult = {
    readonly findings: readonly ArchitectureFinding[];
    readonly summary: {
        readonly total: number;
        readonly blocking: number;
        readonly review: number;
        readonly info: number;
    };
};
/**
 * Evaluate changed files against architecture constraints.
 *
 * Produces findings that inform the change/repair verifier.
 * Findings are ordered by severity: blocking > review > info.
 */
export declare function evaluateArchitectureConstraints(input: ArchitectureEvaluationInput): ArchitectureEvaluationResult;
