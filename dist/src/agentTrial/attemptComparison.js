/**
 * P23: Attempt Comparison
 *
 * Deterministic comparison of two trial attempts.
 *
 * Core rules:
 *   1. Violations matched by (kind, location.file_path) — never by violation_id.
 *   2. constraint_id used as tiebreaker when same kind+path appears multiple times.
 *   3. feedback_effect derived from resolved/new counts + verdict severity.
 *   4. regressed → auto-generates ProtocolGap(feedback_ambiguous).
 *   5. unchanged with violations → auto-generates ProtocolGap(feedback_ignored).
 *
 * Verdict severity order: pass < requires_review < requires_reverse_issue < fail
 */
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
/**
 * Compare two consecutive attempts and compute violation deltas.
 *
 * Cross-attempt violation matching:
 * - Match by (kind, location.file_path) first.
 * - If multiple violations share the same kind+path, use constraint_id as tiebreaker.
 * - violation_id is attempt-local and MUST NOT be used for cross-attempt matching.
 */
export function compareAttempts(fromAttempt, toAttempt) {
    const fromKeys = fromAttempt.violations;
    const toKeys = toAttempt.violations;
    const { resolved, added, persisted } = matchViolations(fromKeys, toKeys);
    const feedbackEffect = deriveFeedbackEffect({
        resolved,
        added,
        verdictFrom: fromAttempt.verification_verdict,
        verdictTo: toAttempt.verification_verdict,
        countFrom: fromAttempt.violation_count,
        countTo: toAttempt.violation_count,
    });
    return {
        from_attempt: fromAttempt.attempt_number,
        to_attempt: toAttempt.attempt_number,
        verdict_from: fromAttempt.verification_verdict,
        verdict_to: toAttempt.verification_verdict,
        violation_count_from: fromAttempt.violation_count,
        violation_count_to: toAttempt.violation_count,
        violation_count_delta: toAttempt.violation_count - fromAttempt.violation_count,
        resolved_violations: resolved,
        new_violations: added,
        persisted_violations: persisted,
        feedback_effect: feedbackEffect,
    };
}
/**
 * Auto-generate protocol gaps from an attempt comparison.
 *
 * Rules:
 *   - regressed → feedback_ambiguous
 *   - unchanged with violations > 0 → feedback_ignored
 */
export function deriveProtocolGapsFromComparison(comparison) {
    const gaps = [];
    if (comparison.feedback_effect === "regressed") {
        gaps.push({
            kind: "feedback_ambiguous",
            evidence: `Attempt ${comparison.to_attempt} regressed: +${comparison.new_violations.length} new violations after feedback.`,
            related_attempt: comparison.to_attempt,
            suggested_change: "Review feedback clarity for violation kinds: " +
                comparison.new_violations.map(v => v.kind).join(", "),
        });
    }
    if (comparison.feedback_effect === "unchanged" &&
        comparison.violation_count_to > 0) {
        gaps.push({
            kind: "feedback_ignored",
            evidence: `Attempt ${comparison.to_attempt} did not reduce violations after feedback.`,
            related_attempt: comparison.to_attempt,
            suggested_change: "Review whether the agent task packet and feedback are sufficiently actionable.",
        });
    }
    return gaps;
}
// ---------------------------------------------------------------------------
// Violation Matching
// ---------------------------------------------------------------------------
function matchViolations(fromKeys, toKeys) {
    const resolved = [];
    const added = [];
    const persisted = [];
    // Build lookup from "to" violations
    const toPool = toKeys.map(k => ({ key: k, matched: false }));
    for (const fromKey of fromKeys) {
        const matchIdx = findBestMatch(fromKey, toPool);
        if (matchIdx >= 0) {
            toPool[matchIdx].matched = true;
            persisted.push(fromKey);
        }
        else {
            resolved.push(fromKey);
        }
    }
    // Unmatched "to" violations are new
    for (const entry of toPool) {
        if (!entry.matched) {
            added.push(entry.key);
        }
    }
    return { resolved, added, persisted };
}
/**
 * Find best match for a violation key in the pool.
 *
 * Priority:
 *   1. Exact match on kind + path + constraint_id
 *   2. Match on kind + path (constraint_id ignored)
 *   3. No match
 *
 * Only considers unmatched entries.
 */
function findBestMatch(key, pool) {
    // Try exact match first (kind + path + constraint_id)
    for (let i = 0; i < pool.length; i++) {
        if (pool[i].matched)
            continue;
        const candidate = pool[i].key;
        if (candidate.kind === key.kind &&
            candidate.path === key.path &&
            candidate.constraint_id === key.constraint_id) {
            return i;
        }
    }
    // Fallback: kind + path only
    for (let i = 0; i < pool.length; i++) {
        if (pool[i].matched)
            continue;
        const candidate = pool[i].key;
        if (candidate.kind === key.kind && candidate.path === key.path) {
            return i;
        }
    }
    return -1;
}
// ---------------------------------------------------------------------------
// Feedback Effect Derivation
// ---------------------------------------------------------------------------
const VERDICT_SEVERITY = {
    pass: 0,
    requires_review: 1,
    requires_reverse_issue: 2,
    fail: 3,
};
/**
 * Derive feedback_effect from violation deltas and verdict change.
 *
 * Rules:
 *   improved:   resolved > 0  AND  new == 0  AND  verdict severity ≤ previous
 *   regressed:  new > 0       AND  resolved == 0
 *   mixed:      resolved > 0  AND  new > 0
 *   unchanged:  resolved == 0 AND  new == 0  AND  violation_count_delta == 0
 *   unknown:    fallback (should not happen with valid inputs)
 *
 * Edge case: violation_count unchanged but key set changed → mixed
 */
function deriveFeedbackEffect(input) {
    const { resolved, added, verdictFrom, verdictTo, countFrom, countTo } = input;
    const hasResolved = resolved.length > 0;
    const hasNew = added.length > 0;
    // Both resolved and new → mixed
    if (hasResolved && hasNew) {
        return "mixed";
    }
    // Only resolved, no new
    if (hasResolved && !hasNew) {
        const severityFrom = VERDICT_SEVERITY[verdictFrom] ?? 3;
        const severityTo = VERDICT_SEVERITY[verdictTo] ?? 3;
        if (severityTo <= severityFrom) {
            return "improved";
        }
        // Resolved violations but verdict got worse (unlikely but possible)
        return "mixed";
    }
    // Only new, no resolved
    if (!hasResolved && hasNew) {
        return "regressed";
    }
    // No resolved, no new
    if (countFrom === countTo) {
        return "unchanged";
    }
    // Count changed without key-level changes (should not happen, but handle)
    return "unknown";
}
//# sourceMappingURL=attemptComparison.js.map