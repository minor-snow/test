import { matchesPattern } from "./repairUtils.js";
export function buildRepairScope(input) {
    const filesByPath = new Map(input.observations.observations.files.map(file => [file.path, file]));
    const allowed = new Map();
    const review = new Map();
    const forbidden = new Map();
    for (const pattern of [...input.protectedPatterns, ".pantheon/**", ".cursor/**", ".git/**"]) {
        forbidden.set(pattern, {
            pattern,
            source: "default_policy",
            confidence: "high",
            audit_weight: "critical",
            reason: "Pantheon protected path.",
            evidence: ["repair:default_protected"],
        });
    }
    for (const file of input.suspectSurface.files) {
        allowed.set(file.path, {
            pattern: file.path,
            source: "suspect_surface",
            confidence: file.confidence,
            audit_weight: "normal",
            reason: file.reason,
            evidence: file.evidence,
        });
    }
    for (const testFile of input.impactSurface.related_tests) {
        allowed.set(testFile.path, {
            pattern: testFile.path,
            source: "impact_candidate",
            confidence: testFile.confidence,
            audit_weight: "elevated",
            reason: testFile.reason,
            evidence: testFile.evidence,
        });
    }
    for (const relatedFile of input.impactSurface.related_files) {
        const observed = filesByPath.get(relatedFile.path);
        const target = classifyRelatedFileEntry(relatedFile.path, relatedFile.reason, observed);
        const entry = {
            pattern: relatedFile.path,
            source: target.bucket === "allowed" ? "impact_candidate" : "project_role",
            confidence: relatedFile.confidence,
            audit_weight: target.auditWeight,
            reason: relatedFile.reason,
            evidence: relatedFile.evidence,
        };
        if (target.bucket === "allowed") {
            allowed.set(relatedFile.path, entry);
        }
        else if (target.bucket === "review_required") {
            review.set(relatedFile.path, entry);
        }
        else {
            forbidden.set(relatedFile.path, entry);
        }
    }
    for (const riskArea of input.impactSurface.risk_areas) {
        const entry = {
            pattern: riskArea.pattern,
            source: riskArea.source === "risk_preset" ? "risk_preset" : "project_role",
            confidence: riskArea.severity === "critical" ? "high" : "medium",
            audit_weight: riskArea.bucket === "forbidden" ? "critical" : riskArea.severity === "critical" ? "critical" : "elevated",
            reason: riskArea.reason,
            evidence: riskArea.evidence,
        };
        if (riskArea.bucket === "forbidden") {
            forbidden.set(riskArea.pattern, entry);
        }
        else {
            review.set(riskArea.pattern, entry);
        }
    }
    if (input.pythonSidecar) {
        for (const suggestion of input.pythonSidecar.risk_preset_validation.suggested_review) {
            if (!review.has(suggestion.pattern) && !forbidden.has(suggestion.pattern)) {
                review.set(suggestion.pattern, {
                    pattern: suggestion.pattern,
                    source: "risk_preset",
                    confidence: input.pythonSidecar.risk_preset_validation.confidence,
                    audit_weight: suggestion.severity === "critical" ? "critical" : "elevated",
                    reason: suggestion.reason,
                    evidence: suggestion.evidence,
                });
            }
        }
        for (const suggestion of input.pythonSidecar.risk_preset_validation.suggested_forbidden) {
            forbidden.set(suggestion.pattern, {
                pattern: suggestion.pattern,
                source: "risk_preset",
                confidence: input.pythonSidecar.risk_preset_validation.confidence,
                audit_weight: "critical",
                reason: suggestion.reason,
                evidence: suggestion.evidence,
            });
        }
    }
    // Precedence: forbidden > review > allowed
    const forbidPatterns = [...forbidden.keys()];
    const reviewPatterns = [...review.keys()];
    for (const pattern of [...allowed.keys()]) {
        if (forbidPatterns.some(forbid => matchesPattern(pattern, forbid)) ||
            reviewPatterns.some(reviewPattern => matchesPattern(pattern, reviewPattern))) {
            allowed.delete(pattern);
        }
    }
    for (const pattern of [...review.keys()]) {
        if (forbidPatterns.some(forbid => matchesPattern(pattern, forbid))) {
            review.delete(pattern);
        }
    }
    return {
        allowed: sortEntries(allowed),
        review_required: sortEntries(review),
        forbidden: sortEntries(forbidden),
    };
}
function classifyRelatedFileEntry(path, reason, observedFile) {
    const lowerReason = reason.toLowerCase();
    if (lowerReason.includes("migration") || lowerReason.includes("secret")) {
        return { bucket: "forbidden", auditWeight: "critical" };
    }
    if (observedFile?.bucket === "config" || lowerReason.includes("auth") || lowerReason.includes("payment")) {
        return { bucket: "review_required", auditWeight: "critical" };
    }
    if (observedFile?.bucket === "generated" || observedFile?.bucket === "docs") {
        return { bucket: "review_required", auditWeight: "elevated" };
    }
    return { bucket: "allowed", auditWeight: "elevated" };
}
function sortEntries(entries) {
    return [...entries.values()].sort((a, b) => a.pattern.localeCompare(b.pattern));
}
//# sourceMappingURL=repairScopeBuilder.js.map