/**
 * P29.5: Verdict Severity — centralized verdict ordering.
 *
 * All verdict comparison logic MUST use this module.
 * Never hardcode verdict ordering in comment renderers, exit policies,
 * review queue builders, or metrics aggregators.
 *
 * ref: P29.5 implementation guard #1
 */
// ---------------------------------------------------------------------------
// Severity rank map
// ---------------------------------------------------------------------------
const VERDICT_RANK = {
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
export function maxVerdict(a, b) {
    return VERDICT_RANK[a] >= VERDICT_RANK[b] ? a : b;
}
/**
 * Returns true if `a` is strictly more severe than `b`.
 */
export function isMoreSevere(a, b) {
    return VERDICT_RANK[a] > VERDICT_RANK[b];
}
/**
 * Returns the numeric severity rank for a verdict (0 = least severe).
 */
export function verdictRank(v) {
    return VERDICT_RANK[v];
}
/**
 * Normalizes legacy verdict strings to PantheonCheckVerdict.
 * Maps old "blocking" → "fail" for backward compatibility.
 */
export function normalizeVerdict(raw) {
    if (raw === "blocking")
        return "fail";
    if (raw in VERDICT_RANK)
        return raw;
    return "fail"; // unknown → fail-closed
}
/**
 * Converts a ContractGateVerdict to PantheonCheckVerdict.
 * Direct 1:1 mapping — ContractGateVerdict is a subset.
 */
export function gateVerdictToPublic(v) {
    return v;
}
/**
 * Returns true if the verdict should block CI / prevent merge.
 */
export function shouldBlock(v) {
    return VERDICT_RANK[v] >= VERDICT_RANK.requires_contract;
}
//# sourceMappingURL=verdictSeverity.js.map