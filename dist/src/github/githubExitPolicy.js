/**
 * Unified exit policy for all Pantheon GitHub Action modes.
 *
 * Enforces consistency across Boundary, Repair, and Change modes:
 * - 'pass' -> Always Exit 0
 * - 'requires_review' -> Exit 0 by default, Exit 1 if fail_on='all'
 * - 'fail', 'requires_contract', 'requires_replan', 'requires_scope_expansion' -> Exit 1 by default
 */
export function decideGitHubActionExit(input) {
    const { sanitizerViolations = 0, failOn } = input;
    if (failOn.includes("none")) {
        return {
            shouldFail: false,
            matchedConditions: [],
            reason: "No fail conditions enabled.",
        };
    }
    const matched = new Set();
    // 1. Sanitizer Violations (Critical)
    if (sanitizerViolations > 0) {
        matched.add("sanitizer_violation");
    }
    // 2. Verdict-based decisions
    const verdict = input.verdict ?? input.check?.verdict ?? "pass";
    if (verdict !== "pass") {
        const condition = mapVerdictToFailCondition(verdict);
        // console.log(`DEBUG: verdict=${verdict}, condition=${condition}, failOn=${JSON.stringify(failOn)}`);
        // Allow matching either the mapped condition OR the raw verdict string (legacy support)
        if (failOn.includes("all") || failOn.includes(condition) || failOn.includes(verdict)) {
            matched.add(condition);
        }
        else if (isBlockingVerdict(verdict)) {
            if (failOn.includes("forbidden") || failOn.includes("outside_scope") || failOn.includes("review_required")) {
                matched.add(condition);
            }
        }
    }
    // 3. Finding-based decisions (Legacy compatibility)
    if (input.check?.findings) {
        for (const finding of input.check.findings) {
            if (finding.kind === "forbidden_file_modified" && failOn.includes("forbidden")) {
                matched.add("forbidden");
            }
            if (finding.kind === "outside_scope_file" && failOn.includes("outside_scope")) {
                matched.add("outside_scope");
            }
            if (finding.severity === "review_required" && failOn.includes("review_required")) {
                matched.add("review_required");
            }
        }
    }
    if (matched.size === 0) {
        return {
            shouldFail: false,
            matchedConditions: [],
            reason: `Verdict '${verdict}' does not trigger configured fail conditions.`,
        };
    }
    return {
        shouldFail: true,
        matchedConditions: [...matched],
        reason: `Verdict '${verdict}' triggered fail conditions: ${[...matched].join(", ")}`,
    };
}
function isBlockingVerdict(verdict) {
    return (verdict === "fail" ||
        verdict === "requires_contract" ||
        verdict === "requires_replan" ||
        verdict === "requires_scope_expansion");
}
function mapVerdictToFailCondition(verdict) {
    if (verdict === "fail")
        return "forbidden";
    if (verdict === "requires_scope_expansion")
        return "outside_scope";
    if (verdict === "requires_review")
        return "review_required";
    // Default to review_required for contract/replan/etc.
    return "review_required";
}
/** @deprecated use decideGitHubActionExit */
export const decideGitHubRepairExit = decideGitHubActionExit;
//# sourceMappingURL=githubExitPolicy.js.map