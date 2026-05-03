const VERDICT_PRIORITY = {
    "fail": 60,
    "requires_replan": 50,
    "requires_scope_expansion": 40,
    "requires_contract": 30,
    "requires_review": 20,
    "pass": 10,
};
export function resolveChangeVerdict(findings) {
    let highest = "pass";
    for (const finding of findings) {
        let candidate = "pass";
        switch (finding.kind) {
            case "forbidden_file":
            case "architecture_forbidden":
            case "trust_tamper":
            case "contract_tamper":
            case "sanitizer_leak":
                candidate = "fail";
                break;
            case "stale_base_sha":
            case "bootstrap_scope_mixed_with_change":
            case "dirty_working_tree":
                candidate = "requires_replan";
                break;
            case "outside_scope_file":
            case "cross_module_boundary":
                candidate = "requires_scope_expansion";
                break;
            case "missing_contract":
            case "high_risk_diff":
                candidate = "requires_contract";
                break;
            case "review_required_file":
            case "architecture_review_required":
            case "architecture_contract_modified":
            case "test_weakening":
            case "architecture_change_type":
                candidate = "requires_review";
                break;
            default:
                // By default warnings might just be requires_review or pass depending on strictness
                if (finding.severity === "error" || finding.severity === "fatal") {
                    candidate = "fail";
                }
                break;
        }
        if (VERDICT_PRIORITY[candidate] > VERDICT_PRIORITY[highest]) {
            highest = candidate;
        }
    }
    return highest;
}
//# sourceMappingURL=changeVerdictResolver.js.map