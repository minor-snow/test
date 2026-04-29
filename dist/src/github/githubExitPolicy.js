export function decideGitHubActionExit(input) {
    const { check, failOn } = input;
    if (failOn.includes("none")) {
        return {
            shouldFail: false,
            matchedConditions: [],
            reason: "No fail conditions enabled.",
        };
    }
    const matched = new Set();
    for (const finding of check.findings) {
        if (failOn.includes("all")) {
            matched.add(classifyFinding(finding.kind, finding.severity));
            continue;
        }
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
    if (matched.size === 0) {
        return {
            shouldFail: false,
            matchedConditions: [],
            reason: "No configured blocking findings detected.",
        };
    }
    return {
        shouldFail: true,
        matchedConditions: [...matched],
        reason: `Matched fail conditions: ${[...matched].join(", ")}`,
    };
}
function classifyFinding(kind, severity) {
    if (kind === "forbidden_file_modified")
        return "forbidden";
    if (kind === "outside_scope_file")
        return "outside_scope";
    if (severity === "review_required")
        return "review_required";
    return "forbidden";
}
//# sourceMappingURL=githubExitPolicy.js.map