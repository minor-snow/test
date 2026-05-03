/**
 * P19.1: Change Contract Validator
 *
 * Structural validator for ChangeContract objects.
 * Ensures schema completeness, lifecycle consistency, reference integrity,
 * obligation coherence, and event ledger monotonicity.
 *
 * Design invariants:
 *   - Validates against current schema: allowed_files[] / required_tests[]
 *   - Rejects waived obligations (future work requires operator override + audit)
 *   - Rejects .md authority refs (JSON is authoritative, Markdown is projection)
 *   - Top-level dump-field guard (no full artifact copies on contract)
 *   - Does NOT consume or validate Markdown output
 *
 * ref: P19.1
 */
import type { ChangeContract } from "./types.js";
export type ValidationResult = {
    status: "valid" | "invalid";
    errors: string[];
    warnings: string[];
};
/**
 * Validate a ChangeContract for structural completeness and semantic coherence.
 *
 * Returns { status: "valid", errors: [], warnings: [...] } on success,
 * or { status: "invalid", errors: [...], warnings: [...] } on failure.
 */
export declare function validateChangeContract(contract: ChangeContract): ValidationResult;
