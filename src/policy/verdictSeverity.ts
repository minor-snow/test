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

// ---------------------------------------------------------------------------
// Unified verdict type (public-facing)
// ---------------------------------------------------------------------------

/**
 * PantheonCheckVerdict is the unified public verdict type.
 * It merges ContractGateVerdict and RepairVerdict semantics
 * into one ordered enum for external consumers.
 */
export type PantheonCheckVerdict =
  | "pass"
  | "requires_review"
  | "requires_scope_expansion"
  | "requires_contract"
  | "requires_replan"
  | "fail";

// ---------------------------------------------------------------------------
// Severity rank map
// ---------------------------------------------------------------------------

const VERDICT_RANK: Record<PantheonCheckVerdict, number> = {
  pass: 0,
  requires_review: 1,
  requires_scope_expansion: 2,
  requires_contract: 3,
  requires_replan: 4,
  fail: 5,
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the more severe of two verdicts.
 * Used to compose gate + pipeline results without losing severity.
 */
export function maxVerdict(a: PantheonCheckVerdict, b: PantheonCheckVerdict): PantheonCheckVerdict {
  return VERDICT_RANK[a] >= VERDICT_RANK[b] ? a : b;
}

/**
 * Returns true if `a` is strictly more severe than `b`.
 */
export function isMoreSevere(a: PantheonCheckVerdict, b: PantheonCheckVerdict): boolean {
  return VERDICT_RANK[a] > VERDICT_RANK[b];
}

/**
 * Returns the numeric severity rank for a verdict (0 = least severe).
 */
export function verdictRank(v: PantheonCheckVerdict): number {
  return VERDICT_RANK[v];
}

/**
 * Normalizes legacy verdict strings to PantheonCheckVerdict.
 * Maps old "blocking" → "fail" for backward compatibility.
 */
export function normalizeVerdict(raw: string): PantheonCheckVerdict {
  if (raw === "blocking") return "fail";
  if (raw in VERDICT_RANK) return raw as PantheonCheckVerdict;
  return "fail"; // unknown → fail-closed
}

/**
 * Converts a ContractGateVerdict to PantheonCheckVerdict.
 * Direct 1:1 mapping — ContractGateVerdict is a subset.
 */
export function gateVerdictToPublic(v: ContractGateVerdict): PantheonCheckVerdict {
  return v as PantheonCheckVerdict;
}

/**
 * Returns true if the verdict should block CI / prevent merge.
 */
export function shouldBlock(v: PantheonCheckVerdict): boolean {
  return VERDICT_RANK[v] >= VERDICT_RANK.requires_contract;
}
