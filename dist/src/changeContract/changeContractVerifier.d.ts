/**
 * P19d: Change Contract Verifier
 *
 * Consumes a P18 ScopeDiffReport and applies its verdict to a ChangeContract.
 * This closes the verification loop:
 *   P15 → P17 → P19b (build) → P19c (export) → agent work → P18 (diff) → P19d (verify)
 *
 * The verifier:
 *   1. Validates the contract is in "exported" or "escalated" status
 *   2. Validates the report's scope_id matches the contract's scope
 *   3. Transitions the contract based on the report verdict:
 *      - pass → "verified"
 *      - fail → "escalated" (with violations)
 *      - requires_reverse_issue → "escalated"
 *      - requires_human_review → "escalated"
 *   4. Updates verification obligations (scope_diff → passed/failed)
 *   5. Records scope_diff_report_hash on refs
 *
 * Design invariants:
 *   - Only "exported" or "escalated" contracts can be verified (fail-closed).
 *   - The report's scope hash must match the contract's scope_hash.
 *   - On pass: transitions to "verified" with scope_diff_verified event.
 *   - On fail: transitions to "escalated" with reverse_issue_required event.
 *   - Obligations are updated but never removed (append-only spirit).
 *
 * ref: P19d
 */
import type { ChangeContract } from "./types.js";
import type { ScopeDiffReport } from "../scopeDiff/types.js";
export type VerifyChangeContractInput = {
    /** The ChangeContract to verify. Must be in "exported" or "escalated". */
    contract: ChangeContract;
    /** The P18 scope diff report. */
    scopeDiffReport: ScopeDiffReport;
    /** Timestamp override for deterministic testing. */
    timestamp?: string;
};
export type VerifyChangeContractResult = {
    /** Updated contract after verification. */
    contract: ChangeContract;
    /** Whether the verification passed. */
    passed: boolean;
    /** Blocking reasons from the report (empty if passed). */
    blocking_reasons: string[];
    /** Hash of the scope diff report for ref-linking. */
    report_hash: string;
};
/**
 * Verify a ChangeContract against a P18 scope diff report.
 *
 * @throws if the contract is not in "exported" or "escalated" status.
 * @throws if the report's scope hash doesn't match the contract.
 */
export declare function verifyChangeContract(input: VerifyChangeContractInput): VerifyChangeContractResult;
