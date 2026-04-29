/**
 * Draft Intake — Tests
 *
 * ref: P9-005
 *
 * Verifies:
 *   1. accept_as_seed does NOT create canonical pointer (BUG-6 regression)
 *   2. All intake decisions write to DecisionLog
 *   3. Quality snapshot is recorded in DecisionLog
 *   4. Missing rationale is rejected
 *   5. Missing operator_id is rejected
 *   6. Missing quarantine item is rejected
 *   7. Invalid decision type is rejected
 */
export {};
