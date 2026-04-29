/**
 * P23: Attempt Comparison Tests
 *
 * Tests for deterministic violation matching and feedback_effect derivation.
 */
import { describe, it, expect } from "vitest";
import { compareAttempts, deriveProtocolGapsFromComparison } from "../../src/agentTrial/attemptComparison.js";
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeAttempt(num, verdict, violations) {
    return {
        attempt_number: num,
        started_at: "2026-01-01T00:00:00Z",
        actual_diff: { changed_files: ["src/a.ts"], diff_source: "simulated" },
        verification_verdict: verdict,
        violation_count: violations.length,
        violations,
        feedback_generated: true,
    };
}
function key(kind, path, constraintId) {
    return { kind, path, constraint_id: constraintId };
}
// ---------------------------------------------------------------------------
// Violation Matching
// ---------------------------------------------------------------------------
describe("compareAttempts — violation matching", () => {
    it("same violation in both attempts → persisted", () => {
        const v = key("outside_scope_file", "src/a.ts");
        const cmp = compareAttempts(makeAttempt(1, "requires_reverse_issue", [v]), makeAttempt(2, "requires_reverse_issue", [v]));
        expect(cmp.persisted_violations).toHaveLength(1);
        expect(cmp.resolved_violations).toHaveLength(0);
        expect(cmp.new_violations).toHaveLength(0);
    });
    it("violation in A but not B → resolved", () => {
        const v = key("outside_scope_file", "src/a.ts");
        const cmp = compareAttempts(makeAttempt(1, "requires_reverse_issue", [v]), makeAttempt(2, "pass", []));
        expect(cmp.resolved_violations).toHaveLength(1);
        expect(cmp.resolved_violations[0].kind).toBe("outside_scope_file");
        expect(cmp.new_violations).toHaveLength(0);
        expect(cmp.persisted_violations).toHaveLength(0);
    });
    it("violation in B but not A → new", () => {
        const v = key("missing_test_mapping", "src/b.ts");
        const cmp = compareAttempts(makeAttempt(1, "pass", []), makeAttempt(2, "requires_review", [v]));
        expect(cmp.new_violations).toHaveLength(1);
        expect(cmp.new_violations[0].kind).toBe("missing_test_mapping");
        expect(cmp.resolved_violations).toHaveLength(0);
    });
    it("constraint_id tiebreaker when same kind+path appears twice", () => {
        const v1 = key("undeclared_package", "src/a.ts", "pkg.lodash");
        const v2 = key("undeclared_package", "src/a.ts", "pkg.express");
        const cmp = compareAttempts(makeAttempt(1, "requires_review", [v1, v2]), makeAttempt(2, "requires_review", [v1]));
        expect(cmp.persisted_violations).toHaveLength(1);
        expect(cmp.resolved_violations).toHaveLength(1);
        expect(cmp.resolved_violations[0].constraint_id).toBe("pkg.express");
    });
    it("empty violations on both sides → no deltas", () => {
        const cmp = compareAttempts(makeAttempt(1, "pass", []), makeAttempt(2, "pass", []));
        expect(cmp.resolved_violations).toHaveLength(0);
        expect(cmp.new_violations).toHaveLength(0);
        expect(cmp.persisted_violations).toHaveLength(0);
    });
});
// ---------------------------------------------------------------------------
// Feedback Effect Derivation
// ---------------------------------------------------------------------------
describe("compareAttempts — feedback_effect", () => {
    it("resolved > 0, new == 0, severity decreased → improved", () => {
        const cmp = compareAttempts(makeAttempt(1, "requires_reverse_issue", [key("outside_scope_file", "src/a.ts")]), makeAttempt(2, "pass", []));
        expect(cmp.feedback_effect).toBe("improved");
    });
    it("resolved > 0, new > 0 → mixed", () => {
        const cmp = compareAttempts(makeAttempt(1, "requires_review", [key("missing_test_mapping", "src/a.ts")]), makeAttempt(2, "requires_review", [key("undeclared_package", "src/b.ts")]));
        expect(cmp.feedback_effect).toBe("mixed");
    });
    it("new > 0, resolved == 0 → regressed", () => {
        const cmp = compareAttempts(makeAttempt(1, "pass", []), makeAttempt(2, "requires_review", [key("missing_test_mapping", "src/a.ts")]));
        expect(cmp.feedback_effect).toBe("regressed");
    });
    it("no changes, no violations → unchanged", () => {
        const cmp = compareAttempts(makeAttempt(1, "pass", []), makeAttempt(2, "pass", []));
        expect(cmp.feedback_effect).toBe("unchanged");
    });
    it("same violations, same count → unchanged", () => {
        const v = key("sensitive_path", "src/config.ts");
        const cmp = compareAttempts(makeAttempt(1, "requires_review", [v]), makeAttempt(2, "requires_review", [v]));
        expect(cmp.feedback_effect).toBe("unchanged");
    });
    it("violation_count_delta is computed correctly", () => {
        const cmp = compareAttempts(makeAttempt(1, "requires_reverse_issue", [
            key("outside_scope_file", "src/a.ts"),
            key("missing_test_mapping", "src/b.ts"),
        ]), makeAttempt(2, "pass", []));
        expect(cmp.violation_count_delta).toBe(-2);
    });
    it("resolved > 0, new == 0, but verdict severity increased → mixed", () => {
        // Agent resolved a low-severity violation but the remaining state
        // somehow has a worse verdict (e.g., verifier upgraded severity).
        // resolved > 0, new == 0, but verdictTo > verdictFrom → mixed
        const cmp = compareAttempts(makeAttempt(1, "requires_review", [key("missing_test_mapping", "src/a.ts")]), makeAttempt(2, "requires_reverse_issue", []));
        expect(cmp.feedback_effect).toBe("mixed");
        expect(cmp.resolved_violations).toHaveLength(1);
        expect(cmp.new_violations).toHaveLength(0);
    });
});
// ---------------------------------------------------------------------------
// Protocol Gap Auto-Generation
// ---------------------------------------------------------------------------
describe("deriveProtocolGapsFromComparison", () => {
    it("regressed → feedback_ambiguous gap", () => {
        const cmp = compareAttempts(makeAttempt(1, "pass", []), makeAttempt(2, "requires_review", [key("missing_test_mapping", "src/a.ts")]));
        const gaps = deriveProtocolGapsFromComparison(cmp);
        expect(gaps).toHaveLength(1);
        expect(gaps[0].kind).toBe("feedback_ambiguous");
        expect(gaps[0].related_attempt).toBe(2);
    });
    it("unchanged with violations → feedback_ignored gap", () => {
        const v = key("sensitive_path", "src/config.ts");
        const cmp = compareAttempts(makeAttempt(1, "requires_review", [v]), makeAttempt(2, "requires_review", [v]));
        const gaps = deriveProtocolGapsFromComparison(cmp);
        expect(gaps).toHaveLength(1);
        expect(gaps[0].kind).toBe("feedback_ignored");
    });
    it("improved → no gaps", () => {
        const cmp = compareAttempts(makeAttempt(1, "requires_reverse_issue", [key("outside_scope_file", "src/a.ts")]), makeAttempt(2, "pass", []));
        const gaps = deriveProtocolGapsFromComparison(cmp);
        expect(gaps).toHaveLength(0);
    });
    it("unchanged with zero violations → no gaps", () => {
        const cmp = compareAttempts(makeAttempt(1, "pass", []), makeAttempt(2, "pass", []));
        const gaps = deriveProtocolGapsFromComparison(cmp);
        expect(gaps).toHaveLength(0);
    });
});
//# sourceMappingURL=attemptComparison.test.js.map