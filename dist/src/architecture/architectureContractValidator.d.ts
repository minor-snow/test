/**
 * P30: Architecture Contract Validator
 *
 * Validates architecture contract integrity before it becomes active.
 * Enforces structural invariants that protect the governance chain.
 *
 * Core checks:
 * 1. All accepted relations must have provenance (claim_ids or override_ids)
 * 2. No absolute paths in contract
 * 3. Contract hash matches recomputed hash
 * 4. No unreviewed claims leaked into constraints
 * 5. Advisory-only relations never appear in constraints
 *
 * ref: P30
 */
import type { ArchitectureContract } from "./types.js";
export type ArchitectureContractValidationResult = {
    readonly status: "valid" | "invalid";
    readonly errors: readonly string[];
    readonly warnings: readonly string[];
};
/**
 * Validate an architecture contract for structural integrity.
 *
 * This must pass before a contract is written to disk as the active contract.
 */
export declare function validateArchitectureContract(contract: ArchitectureContract): ArchitectureContractValidationResult;
