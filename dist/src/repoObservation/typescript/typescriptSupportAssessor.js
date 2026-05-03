/**
 * P28c: TypeScript/JavaScript Support Level Assessor
 *
 * Determines the support level for a TS/JS repository based on
 * observation signals.
 *
 * Levels:
 *   validated  — framework + test mappings + risk preset matched
 *   supported  — framework or role detected + some signals
 *   smoke      — valid package.json + source files + meaningful config
 *   observed_only — package.json exists but no meaningful engineering signals
 *   unsupported — no package.json or no TS/JS files at all
 *
 * Guardrail: package.json-only without source files stays observed_only.
 * Smoke requires package.json + source files + at least one meaningful signal.
 */
export function assessTypeScriptSupportLevel(input) {
    const reasons = [];
    const frameworkSignals = input.frameworkProfile.framework_signals.length;
    const roleSignals = input.frameworkProfile.project_role_signals.length;
    const testMappingCount = input.testMappings.length;
    const sourceFiles = input.tsFiles.filter(f => f.bucket === "source");
    const testFiles = input.tsFiles.filter(f => f.bucket === "test");
    const configFiles = input.tsFiles.filter(f => f.bucket === "config");
    // --- unsupported ---
    if (!input.hasPackageJson) {
        reasons.push("Missing package.json");
        return makeResult("unsupported", reasons, frameworkSignals, roleSignals, testMappingCount, input.riskPreset.preset);
    }
    if (input.tsFiles.length === 0) {
        reasons.push("No TS/JS files found in repository");
        return makeResult("unsupported", reasons, frameworkSignals, roleSignals, testMappingCount, input.riskPreset.preset);
    }
    // --- observed_only ---
    // package.json exists but no source files = not enough to be smoke
    if (sourceFiles.length === 0) {
        reasons.push("package.json exists but no source files detected");
        return makeResult("observed_only", reasons, frameworkSignals, roleSignals, testMappingCount, input.riskPreset.preset);
    }
    // No meaningful config or framework signals at all
    if (frameworkSignals === 0 && roleSignals === 0 && configFiles.length === 0 &&
        input.layout.primary_layout === "unknown") {
        reasons.push("Source files present but no recognizable framework, role, or config signals");
        return makeResult("observed_only", reasons, frameworkSignals, roleSignals, testMappingCount, input.riskPreset.preset);
    }
    // --- validated ---
    const hasFramework = frameworkSignals > 0;
    const hasRole = roleSignals > 0;
    const hasTestMappings = testMappingCount >= 1;
    const hasTests = testMappingCount >= 1 || testFiles.length > 0;
    const hasRiskPreset = input.riskPreset.validation === "validated" || input.riskPreset.validation === "partial";
    const hasHighConfidenceLayout = input.layout.confidence === "high";
    if (hasFramework && hasTests && hasRiskPreset) {
        reasons.push("Framework detected, tests present, risk preset matched");
        if (hasHighConfidenceLayout)
            reasons.push("High-confidence layout classification");
        return makeResult("validated", reasons, frameworkSignals, roleSignals, testMappingCount, input.riskPreset.preset);
    }
    // Monorepo specific validation
    if (input.layout.primary_layout === "monorepo_workspace" && input.workspace && input.workspace.packages && input.workspace.packages.length > 0) {
        if (testMappingCount >= 1 || testFiles.length > 0) {
            reasons.push("Monorepo workspace with internal packages and tests safely validated (package-local)");
            return makeResult("validated", reasons, frameworkSignals, roleSignals, testMappingCount, input.riskPreset.preset);
        }
    }
    // --- supported ---
    if (hasFramework || hasRole) {
        reasons.push("Framework or project role detected");
        if (hasTestMappings)
            reasons.push("Test mappings present");
        if (input.layout.primary_layout !== "unknown")
            reasons.push(`Layout: ${input.layout.primary_layout}`);
        return makeResult("supported", reasons, frameworkSignals, roleSignals, testMappingCount, input.riskPreset.preset);
    }
    // --- smoke ---
    // Has package.json + source files + some config
    reasons.push("package.json and source files present with some configuration");
    if (configFiles.length > 0)
        reasons.push(`${configFiles.length} config files detected`);
    if (testFiles.length > 0)
        reasons.push(`${testFiles.length} test files detected`);
    return makeResult("smoke", reasons, frameworkSignals, roleSignals, testMappingCount, input.riskPreset.preset);
}
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeResult(level, reasons, frameworkSignals, roleSignals, testMappingCount, riskPreset) {
    return { level, reasons, framework_signals: frameworkSignals, role_signals: roleSignals, test_mapping_count: testMappingCount, risk_preset: riskPreset };
}
//# sourceMappingURL=typescriptSupportAssessor.js.map