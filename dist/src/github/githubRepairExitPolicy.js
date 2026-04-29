export function decideGitHubRepairExit(input) {
    const { verdict, sanitizerViolations, failOn } = input;
    if (failOn.includes("none")) {
        return {
            shouldFail: false,
            matchedConditions: [],
            reason: "No fail conditions enabled.",
        };
    }
    const matched = new Set();
    if (failOn.includes("all")) {
        if (verdict !== "pass") {
            matched.add(verdict);
        }
        if (sanitizerViolations > 0) {
            matched.add("public_artifact_sanitizer_violation");
        }
    }
    else {
        if (failOn.includes(verdict)) {
            matched.add(verdict);
        }
        if (sanitizerViolations > 0 && failOn.includes("public_artifact_sanitizer_violation")) {
            matched.add("public_artifact_sanitizer_violation");
        }
    }
    if (matched.size === 0) {
        return {
            shouldFail: false,
            matchedConditions: [],
            reason: "No configured blocking repair findings detected.",
        };
    }
    return {
        shouldFail: true,
        matchedConditions: [...matched],
        reason: `Matched fail conditions: ${[...matched].join(", ")}`,
    };
}
//# sourceMappingURL=githubRepairExitPolicy.js.map