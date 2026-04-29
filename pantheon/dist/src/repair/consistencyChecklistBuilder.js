import { deterministicId, uniqueSorted } from "./repairUtils.js";
export function buildConsistencyChecklist(input) {
    const checks = [];
    const profile = deriveRepairProfile(input.observations, input.pythonSidecar, input.impactSurface);
    for (const statement of uniqueSorted(input.userMustPreserve)) {
        checks.push(makeCheck(statement, "user_must_preserve", "hard", ["repair:user_must_preserve"], "Operator-specified hard constraint."));
    }
    if (profile === "sdk_library") {
        checks.push(makeCheck("Do not change exported public API symbols without review.", "project_role", "review", ["project_role:python_sdk_library"], "Library repairs can break downstream consumers through API drift."));
        checks.push(makeCheck("Preserve request/response configuration compatibility when touching client or transport modules.", "project_role", "review", ["project_role:python_sdk_library"], "Client behavior changes can silently break callers."));
    }
    else if (profile === "service_backend") {
        checks.push(makeCheck("Do not bypass authentication or authorization dependencies.", "project_role", "hard", ["project_role:service_backend"], "Service repairs must not weaken request-level security checks."));
        checks.push(makeCheck("Do not change schema or migration behavior without review.", "risk_preset", "review", ["project_role:service_backend"], "Database and migration-adjacent changes require human review."));
    }
    else if (profile === "commerce_backend") {
        checks.push(makeCheck("Do not alter payment, order, or tax behavior outside the intended fix.", "risk_preset", "hard", ["risk_area:commerce_backend"], "Commerce repairs are money-flow adjacent and can create hidden regressions."));
        checks.push(makeCheck("Do not modify migrations automatically.", "risk_preset", "hard", ["risk_area:migration"], "Schema changes require explicit human approval."));
    }
    else {
        checks.push(makeCheck("Keep the repair local to the reported issue and avoid broad unrelated refactors.", "project_role", "advisory", ["project_role:generic_application"], "P28 focuses on conservative, bounded repairs."));
    }
    if (input.testSignals.related.length > 0 || input.testSignals.recommended.length > 0) {
        checks.push(makeCheck("Update or inspect related tests when the repair changes behavior.", "test_signal", "review", [
            ...input.testSignals.related.map(path => `related_test:${path}`),
            ...input.testSignals.recommended.map(path => `recommended_test:${path}`),
        ], "Related tests are the best available deterministic proxy for behavioral impact in bootstrap mode."));
    }
    if (input.impactSurface.unknowns.length > 0) {
        checks.push(makeCheck("Unknown impact surface remains. Keep the repair conservative and escalate if scope expands.", "unknown_surface", "review", input.impactSurface.unknowns.map(item => item.kind), "Pantheon found unresolved impact signals; those must not be silently ignored."));
    }
    return checks;
}
function deriveRepairProfile(observations, pythonSidecar, impactSurface) {
    const preset = pythonSidecar?.risk_preset_validation.preset;
    if (preset === "python_sdk_library")
        return "sdk_library";
    if (preset === "fastapi_service" || preset === "generic_service" || preset === "flask_service") {
        return "service_backend";
    }
    if (preset === "django_commerce")
        return "commerce_backend";
    const sensitiveReasons = new Set(observations.observations.sensitive_paths.map(path => path.reason));
    if (sensitiveReasons.has("payment_keyword"))
        return "commerce_backend";
    if (impactSurface.risk_areas.some(area => area.label.includes("auth") || area.label.includes("security"))) {
        return "service_backend";
    }
    return "generic_application";
}
function makeCheck(statement, source, severity, evidence, reason) {
    return {
        id: deterministicId("check", { statement, source, evidence }),
        statement,
        source,
        severity,
        evidence: [...evidence],
        reason,
    };
}
//# sourceMappingURL=consistencyChecklistBuilder.js.map