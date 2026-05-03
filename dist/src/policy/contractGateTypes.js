/**
 * P29.5: Contract Gate Types
 *
 * Core domain types for the Contract Required Gate.
 * These types are internal to the gate evaluation pipeline.
 * The public-facing verdict is unified via PantheonCheckVerdict in cli/types.ts.
 *
 * Design invariants:
 *   - ContractGateVerdict is separate from RepairVerdict (different semantic domains).
 *   - ContractGateResult is the sole output of the gate evaluator.
 *   - Policy source always records where the policy came from.
 *   - Metrics flags are booleans for aggregation simplicity.
 *
 * ref: P29.5
 */
export {};
//# sourceMappingURL=contractGateTypes.js.map