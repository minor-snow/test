/**
 * P29.5: Verdict Severity — centralized verdict ordering.
 *
 * All verdict comparison logic MUST use this module.
 * Never hardcode verdict ordering in comment renderers, exit policies,
 * review queue builders, or metrics aggregators.
 *
 * ref: P29.5 implementation guard #1
 */
import type { ContractGateVerdict } from "./contractGateTypes.js";
/**
 * PantheonCheckVerdict is the unified public verdict type.
 * It merges ContractGateVerdict and RepairVerdict semantics
 * into one ordered enum for external consumers.
 */
export type PantheonCheckVerdict = "pass" | "requires_review" | "requires_scope_expansion" | "requires_contract" | "requires_replan" | "fail";
/**
 * Returns the more severe of two verdicts.
 * Used to compose gate + pipeline results without losing severity.
 */
export declare function maxVerdict(a: PantheonCheckVerdict, b: PantheonCheckVerdict): PantheonCheckVerdict;
/**
 * Returns true if `a` is strictly more severe than `b`.
 */
export declare function isMoreSevere(a: PantheonCheckVerdict, b: PantheonCheckVerdict): boolean;
/**
 * Returns the numeric severity rank for a verdict (0 = least severe).
 */
export declare function verdictRank(v: PantheonCheckVerdict): number;
/**
 * Normalizes legacy verdict strings to PantheonCheckVerdict.
 * Maps old "blocking" → "fail" for backward compatibility.
 */
export declare function normalizeVerdict(raw: string): PantheonCheckVerdict;
/**
 * Converts a ContractGateVerdict to PantheonCheckVerdict.
 * Direct 1:1 mapping — ContractGateVerdict is a subset.
 */
export declare function gateVerdictToPublic(v: ContractGateVerdict): PantheonCheckVerdict;
/**
 * Returns true if the verdict should block CI / prevent merge.
 */
export declare function shouldBlock(v: PantheonCheckVerdict): boolean;
