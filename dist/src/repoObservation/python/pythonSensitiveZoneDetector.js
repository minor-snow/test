/**
 * P25a: Python Sensitive Zone Detector
 *
 * Keyword matching + config overrides for identifying high-risk code areas.
 */
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export function detectPythonSensitiveZones(input) {
    const results = [];
    // 1. Keyword-based detection
    for (const kw of SENSITIVE_KEYWORDS) {
        const matched = input.pythonPaths.filter(p => matchesKeyword(p, kw.keyword));
        if (matched.length > 0) {
            results.push({
                path_pattern: `**/${kw.keyword}/**`,
                matched_paths: matched,
                category: kw.category,
                severity: kw.severity,
                source: "keyword",
                evidence: [`Keyword "${kw.keyword}" found in ${matched.length} paths`],
            });
        }
    }
    // 2. Config overrides
    if (input.sensitiveOverrides) {
        for (const [pattern, category] of Object.entries(input.sensitiveOverrides)) {
            const matched = input.pythonPaths.filter(p => matchGlob(p, pattern));
            if (matched.length > 0) {
                results.push({
                    path_pattern: pattern,
                    matched_paths: matched,
                    category,
                    severity: "high",
                    source: "config_override",
                    evidence: [`Config override: ${pattern} → ${category}`],
                });
            }
        }
    }
    return deduplicateZones(results);
}
const SENSITIVE_KEYWORDS = [
    // Critical
    { keyword: "payment", category: "financial_transactions", severity: "critical" },
    { keyword: "billing", category: "financial_transactions", severity: "critical" },
    { keyword: "invoice", category: "financial_transactions", severity: "critical" },
    { keyword: "refund", category: "financial_transactions", severity: "critical" },
    // High
    { keyword: "checkout", category: "purchase_flow", severity: "high" },
    { keyword: "order", category: "order_lifecycle", severity: "high" },
    { keyword: "account", category: "identity", severity: "high" },
    { keyword: "auth", category: "authentication", severity: "high" },
    { keyword: "permission", category: "authorization", severity: "high" },
    { keyword: "security", category: "security", severity: "high" },
    { keyword: "admin", category: "administration", severity: "high" },
    { keyword: "migration", category: "schema_migration", severity: "high" },
    // Medium
    { keyword: "discount", category: "pricing_adjustment", severity: "medium" },
    { keyword: "tax", category: "regulatory_calculation", severity: "medium" },
    { keyword: "plugin", category: "runtime_extension", severity: "medium" },
    { keyword: "webhook", category: "external_integration", severity: "medium" },
    { keyword: "settings", category: "infrastructure_config", severity: "medium" },
];
// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------
function matchesKeyword(path, keyword) {
    const lower = path.toLowerCase();
    // Match as directory segment or filename segment
    const segments = lower.split("/");
    return segments.some(seg => seg.includes(keyword));
}
function matchGlob(path, pattern) {
    const regex = pattern
        .replace(/[.+^${}()|[\]\\]/g, "\\$&")
        .replace(/\*\*/g, "___DOUBLESTAR___")
        .replace(/\*/g, "[^/]*")
        .replace(/___DOUBLESTAR___/g, ".*");
    return new RegExp(`^${regex}$`).test(path);
}
// ---------------------------------------------------------------------------
// Deduplication
// ---------------------------------------------------------------------------
function deduplicateZones(zones) {
    // Remove zones whose matched_paths are fully subsumed by a higher-severity zone
    // This prevents "auth" and "account" from producing overlapping results
    const seen = new Map();
    for (const zone of zones) {
        const key = zone.category;
        const existing = seen.get(key);
        if (!existing) {
            seen.set(key, zone);
        }
        else {
            // Merge paths
            const mergedPaths = [...new Set([...existing.matched_paths, ...zone.matched_paths])];
            const mergedEvidence = [...existing.evidence, ...zone.evidence];
            seen.set(key, {
                ...existing,
                matched_paths: mergedPaths,
                evidence: mergedEvidence,
                severity: higherSeverity(existing.severity, zone.severity),
            });
        }
    }
    return [...seen.values()];
}
function higherSeverity(a, b) {
    const order = { medium: 0, high: 1, critical: 2 };
    return order[a] >= order[b] ? a : b;
}
//# sourceMappingURL=pythonSensitiveZoneDetector.js.map