/**
 * P27-1e: Python Risk Preset Validator
 *
 * Produces suggested review/forbid boundary candidates based on observed
 * layout, framework, project-role, sensitive zones, and path signals.
 *
 * Hard rules:
 *   - Does NOT auto-decide allowed/review/forbid
 *   - Only outputs suggestions with matched_signals + reason
 *   - Unobserved paths go to dormant_patterns
 *   - SDK/library defaults to review, not forbid
 *   - Unvalidated presets cannot produce strong recommendations
 *   - Does NOT modify test mapper, layout, or framework detector
 */
import { matchesGlob } from "../../globMatch.js";
export function validatePythonRiskPreset(input) {
    // 1. Select preset based on project role + layout
    const presetName = selectPreset(input);
    // 2. Collect observed evidence
    const matchedSignals = collectMatchedSignals(input);
    // 3. Generate suggestions from matching preset rules
    const presetRules = getPresetRules(presetName);
    const suggestedReview = [];
    const suggestedForbidden = [];
    const dormantPatterns = [];
    const pathSet = new Set(input.allPaths);
    for (const rule of presetRules) {
        // Count how many paths match this rule's pattern
        const matchedPaths = input.allPaths.filter(p => matchPattern(p, rule.pattern));
        const matchedCount = matchedPaths.length;
        // Also check if sensitive zones corroborate
        const corroboratingZone = input.sensitiveZones.find(z => z.category === rule.sensitiveCategory || matchedPaths.some(mp => z.matched_paths.includes(mp)));
        if (matchedCount === 0) {
            // Unobserved — goes to dormant
            dormantPatterns.push({
                pattern: rule.pattern,
                reason: rule.dormantReason,
            });
            continue;
        }
        // Build evidence
        const evidence = [];
        evidence.push(`${matchedCount} paths match pattern ${rule.pattern}`);
        if (corroboratingZone) {
            evidence.push(`Sensitive zone "${corroboratingZone.category}" (${corroboratingZone.severity}) corroborates`);
        }
        if (rule.frameworkEvidence) {
            evidence.push(rule.frameworkEvidence);
        }
        const suggestion = {
            pattern: rule.pattern,
            reason: rule.reason,
            severity: rule.severity,
            matched_path_count: matchedCount,
            evidence,
        };
        if (rule.suggestedLevel === "forbidden") {
            suggestedForbidden.push(suggestion);
        }
        else {
            suggestedReview.push(suggestion);
        }
    }
    // 4. Determine validation status
    const totalRules = presetRules.length;
    const activeRules = totalRules - dormantPatterns.length;
    const minimumValidatedRules = Math.max(3, Math.ceil(totalRules * 0.6));
    const validation = activeRules >= minimumValidatedRules ? "validated" :
        activeRules > 0 ? "partial" :
            "unvalidated";
    // 5. Confidence from matched signals
    const confidence = matchedSignals.length >= 3 && validation === "validated" ? "high" :
        matchedSignals.length >= 2 || validation === "partial" ? "medium" :
            "low";
    return {
        preset: presetName,
        validation,
        confidence,
        matched_signals: matchedSignals,
        suggested_review: suggestedReview,
        suggested_forbidden: suggestedForbidden,
        dormant_patterns: dormantPatterns,
    };
}
// ---------------------------------------------------------------------------
// Preset selection
// ---------------------------------------------------------------------------
function selectPreset(input) {
    const roles = input.frameworkProfile.project_role_signals;
    const frameworks = input.frameworkProfile.framework_signals;
    const layout = input.layout;
    // Priority order: most specific role first
    const roleNames = roles.map(r => r.role);
    if (roleNames.includes("commerce_backend") && frameworks.some(f => f.name === "django")) {
        return "django_commerce";
    }
    if (roleNames.includes("service_backend")) {
        const fw = frameworks.find(f => f.kind === "web_framework");
        if (fw?.name === "fastapi")
            return "fastapi_service";
        if (fw?.name === "flask")
            return "flask_service";
        return "generic_service";
    }
    if (roleNames.includes("http_client_library") || roleNames.includes("python_sdk_library")) {
        return "python_sdk_library";
    }
    if (roleNames.includes("cli_application")) {
        return "cli_application";
    }
    if (layout.primary_layout === "django_project")
        return "django_generic";
    if (layout.primary_layout === "library_package")
        return "python_sdk_library";
    if (layout.primary_layout === "api_service")
        return "generic_service";
    return "unknown";
}
// ---------------------------------------------------------------------------
// Signal collection
// ---------------------------------------------------------------------------
function collectMatchedSignals(input) {
    const signals = [];
    // Layout signals
    signals.push(`layout: ${input.layout.primary_layout} / ${input.layout.package_layout} (${input.layout.confidence})`);
    // Framework signals
    for (const fw of input.frameworkProfile.framework_signals) {
        if (fw.confidence === "high" || fw.confidence === "medium") {
            signals.push(`framework: ${fw.name} / ${fw.kind} (${fw.confidence})`);
        }
    }
    // Project role signals
    for (const role of input.frameworkProfile.project_role_signals) {
        signals.push(`project_role: ${role.role} (${role.confidence})`);
    }
    // Sensitive zone signals
    for (const zone of input.sensitiveZones) {
        if (zone.severity === "critical" || zone.severity === "high") {
            signals.push(`sensitive_zone: ${zone.category} (${zone.severity}, ${zone.matched_paths.length} paths)`);
        }
    }
    return signals;
}
// ---------------------------------------------------------------------------
// Pattern matching
// ---------------------------------------------------------------------------
function matchPattern(path, pattern) {
    return matchesGlob(path, pattern);
}
function getPresetRules(presetName) {
    switch (presetName) {
        case "django_commerce": return DJANGO_COMMERCE_RULES;
        case "fastapi_service": return FASTAPI_SERVICE_RULES;
        case "python_sdk_library": return PYTHON_SDK_LIBRARY_RULES;
        case "django_generic": return DJANGO_GENERIC_RULES;
        case "flask_service": return FLASK_SERVICE_RULES;
        case "generic_service": return GENERIC_SERVICE_RULES;
        case "cli_application": return CLI_APPLICATION_RULES;
        default: return GENERIC_RULES;
    }
}
// ---------------------------------------------------------------------------
// Django Commerce rules
// ---------------------------------------------------------------------------
const DJANGO_COMMERCE_RULES = [
    // Forbidden candidates (very selective)
    {
        pattern: "**/migrations/**",
        reason: "Schema migrations should not be auto-generated by AI agents",
        severity: "critical",
        suggestedLevel: "forbidden",
        sensitiveCategory: "schema_migration",
        frameworkEvidence: "Django migration framework detected",
        dormantReason: "No migrations directory observed",
    },
    // Review candidates
    {
        pattern: "**/payment/**",
        reason: "Financial transaction logic requires human review",
        severity: "critical",
        suggestedLevel: "review",
        sensitiveCategory: "financial_transactions",
        dormantReason: "No payment directory observed",
    },
    {
        pattern: "**/billing/**",
        reason: "Billing logic requires human review",
        severity: "critical",
        suggestedLevel: "review",
        sensitiveCategory: "financial_transactions",
        dormantReason: "No billing directory observed",
    },
    {
        pattern: "**/checkout/**",
        reason: "Purchase flow logic requires human review",
        severity: "high",
        suggestedLevel: "review",
        sensitiveCategory: "purchase_flow",
        dormantReason: "No checkout directory observed",
    },
    {
        pattern: "**/order/**",
        reason: "Order lifecycle logic requires human review",
        severity: "high",
        suggestedLevel: "review",
        sensitiveCategory: "order_lifecycle",
        dormantReason: "No order directory observed",
    },
    {
        pattern: "**/account/**",
        reason: "Identity and account management requires human review",
        severity: "high",
        suggestedLevel: "review",
        sensitiveCategory: "identity",
        dormantReason: "No account directory observed",
    },
    {
        pattern: "**/auth/**",
        reason: "Authentication logic requires human review",
        severity: "high",
        suggestedLevel: "review",
        sensitiveCategory: "authentication",
        dormantReason: "No auth directory observed",
    },
    {
        pattern: "**/discount/**",
        reason: "Pricing adjustment logic is money-flow adjacent",
        severity: "medium",
        suggestedLevel: "review",
        sensitiveCategory: "pricing_adjustment",
        dormantReason: "No discount directory observed",
    },
    {
        pattern: "**/tax/**",
        reason: "Tax calculation has regulatory implications",
        severity: "medium",
        suggestedLevel: "review",
        sensitiveCategory: "regulatory_calculation",
        dormantReason: "No tax directory observed",
    },
    {
        pattern: "**/plugin*/**",
        reason: "Plugin/extension points affect runtime behavior",
        severity: "medium",
        suggestedLevel: "review",
        sensitiveCategory: "runtime_extension",
        dormantReason: "No plugin directory observed",
    },
    {
        pattern: "**/settings*",
        reason: "Infrastructure configuration affects system behavior",
        severity: "medium",
        suggestedLevel: "review",
        sensitiveCategory: "infrastructure_config",
        dormantReason: "No settings files observed",
    },
];
// ---------------------------------------------------------------------------
// FastAPI / service rules
// ---------------------------------------------------------------------------
const FASTAPI_SERVICE_RULES = [
    // Forbidden candidates
    {
        pattern: "alembic/**",
        reason: "Database migrations should not be auto-generated by AI agents",
        severity: "critical",
        suggestedLevel: "forbidden",
        frameworkEvidence: "Alembic migration framework detected",
        dormantReason: "No alembic directory observed",
    },
    // Review candidates
    {
        pattern: "**/auth*",
        reason: "Authentication logic requires human review",
        severity: "high",
        suggestedLevel: "review",
        sensitiveCategory: "authentication",
        dormantReason: "No auth files observed",
    },
    {
        pattern: "**/security*",
        reason: "Security module requires human review",
        severity: "high",
        suggestedLevel: "review",
        sensitiveCategory: "security",
        dormantReason: "No security files observed",
    },
    {
        pattern: "**/config*",
        reason: "Application configuration affects system behavior",
        severity: "medium",
        suggestedLevel: "review",
        sensitiveCategory: "infrastructure_config",
        dormantReason: "No config files observed",
    },
    {
        pattern: "**/db/**",
        reason: "Database layer changes affect data integrity",
        severity: "high",
        suggestedLevel: "review",
        dormantReason: "No db directory observed",
    },
    {
        pattern: "**/middleware*",
        reason: "Middleware affects request processing pipeline",
        severity: "medium",
        suggestedLevel: "review",
        dormantReason: "No middleware files observed",
    },
    {
        pattern: "**/deps*",
        reason: "Dependency injection affects route behavior",
        severity: "medium",
        suggestedLevel: "review",
        frameworkEvidence: "FastAPI dependency injection pattern",
        dormantReason: "No deps files observed",
    },
];
const FLASK_SERVICE_RULES = [
    {
        pattern: "**/auth*",
        reason: "Authentication logic requires human review",
        severity: "high",
        suggestedLevel: "review",
        sensitiveCategory: "authentication",
        dormantReason: "No auth files observed",
    },
    {
        pattern: "**/security*",
        reason: "Security module requires human review",
        severity: "high",
        suggestedLevel: "review",
        sensitiveCategory: "security",
        dormantReason: "No security files observed",
    },
    {
        pattern: "**/blueprints/**",
        reason: "Flask blueprint routing affects request behavior",
        severity: "medium",
        suggestedLevel: "review",
        dormantReason: "No Flask blueprint directory observed",
    },
    {
        pattern: "**/config*",
        reason: "Application configuration affects runtime behavior",
        severity: "medium",
        suggestedLevel: "review",
        dormantReason: "No config files observed",
    },
    {
        pattern: "**/extensions*",
        reason: "Flask extensions influence app wiring and security hooks",
        severity: "medium",
        suggestedLevel: "review",
        dormantReason: "No extensions files observed",
    },
];
// ---------------------------------------------------------------------------
// Python SDK / Library rules
// ---------------------------------------------------------------------------
const PYTHON_SDK_LIBRARY_RULES = [
    // SDK/library: prefer review over forbid
    {
        pattern: "**/_client*",
        reason: "Public client behavior surface — changes affect all consumers",
        severity: "high",
        suggestedLevel: "review",
        dormantReason: "No client module observed",
    },
    {
        pattern: "**/_transport*/**",
        reason: "Transport layer affects request execution semantics",
        severity: "high",
        suggestedLevel: "review",
        dormantReason: "No transport module observed",
    },
    {
        pattern: "**/_auth*",
        reason: "Authentication affects security surface",
        severity: "high",
        suggestedLevel: "review",
        sensitiveCategory: "authentication",
        dormantReason: "No auth module observed",
    },
    {
        pattern: "**/_config*",
        reason: "Configuration affects default behavior for all consumers",
        severity: "medium",
        suggestedLevel: "review",
        dormantReason: "No config module observed",
    },
    {
        pattern: "**/__init__.py",
        reason: "Public API exports — changes affect import compatibility",
        severity: "medium",
        suggestedLevel: "review",
        dormantReason: "No __init__.py observed (unusual)",
    },
    {
        pattern: "**/_models*",
        reason: "Data model changes affect serialization and API compatibility",
        severity: "medium",
        suggestedLevel: "review",
        dormantReason: "No models module observed",
    },
    {
        pattern: "**/_urls*",
        reason: "URL handling affects request routing",
        severity: "medium",
        suggestedLevel: "review",
        dormantReason: "No URL module observed",
    },
];
// ---------------------------------------------------------------------------
// Django generic rules (non-commerce)
// ---------------------------------------------------------------------------
const DJANGO_GENERIC_RULES = [
    {
        pattern: "**/migrations/**",
        reason: "Schema migrations should not be auto-generated by AI agents",
        severity: "critical",
        suggestedLevel: "forbidden",
        sensitiveCategory: "schema_migration",
        frameworkEvidence: "Django migration framework detected",
        dormantReason: "No migrations directory observed",
    },
    {
        pattern: "**/auth/**",
        reason: "Authentication logic requires human review",
        severity: "high",
        suggestedLevel: "review",
        sensitiveCategory: "authentication",
        dormantReason: "No auth directory observed",
    },
    {
        pattern: "**/settings*",
        reason: "Django settings affect system-wide behavior",
        severity: "medium",
        suggestedLevel: "review",
        sensitiveCategory: "infrastructure_config",
        dormantReason: "No settings files observed",
    },
    {
        pattern: "**/admin*",
        reason: "Admin interface affects data access controls",
        severity: "medium",
        suggestedLevel: "review",
        sensitiveCategory: "administration",
        dormantReason: "No admin files observed",
    },
];
// ---------------------------------------------------------------------------
// Generic service rules
// ---------------------------------------------------------------------------
const GENERIC_SERVICE_RULES = [
    {
        pattern: "**/auth*",
        reason: "Authentication logic requires human review",
        severity: "high",
        suggestedLevel: "review",
        sensitiveCategory: "authentication",
        dormantReason: "No auth files observed",
    },
    {
        pattern: "**/security*",
        reason: "Security module requires human review",
        severity: "high",
        suggestedLevel: "review",
        sensitiveCategory: "security",
        dormantReason: "No security files observed",
    },
    {
        pattern: "**/config*",
        reason: "Configuration affects system behavior",
        severity: "medium",
        suggestedLevel: "review",
        dormantReason: "No config files observed",
    },
];
// ---------------------------------------------------------------------------
// CLI application rules
// ---------------------------------------------------------------------------
const CLI_APPLICATION_RULES = [
    {
        pattern: "**/config*",
        reason: "CLI configuration affects default behavior",
        severity: "medium",
        suggestedLevel: "review",
        dormantReason: "No config files observed",
    },
    {
        pattern: "**/__main__*",
        reason: "CLI entry point affects invocation behavior",
        severity: "medium",
        suggestedLevel: "review",
        dormantReason: "No __main__.py observed",
    },
];
// ---------------------------------------------------------------------------
// Fallback generic rules
// ---------------------------------------------------------------------------
const GENERIC_RULES = [
    {
        pattern: "**/auth*",
        reason: "Authentication logic requires human review",
        severity: "high",
        suggestedLevel: "review",
        sensitiveCategory: "authentication",
        dormantReason: "No auth files observed",
    },
    {
        pattern: "**/config*",
        reason: "Configuration affects system behavior",
        severity: "medium",
        suggestedLevel: "review",
        dormantReason: "No config files observed",
    },
];
//# sourceMappingURL=pythonRiskPresetValidator.js.map