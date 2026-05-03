import { adaptArchitectureConstraints } from "./architectureConstraintAdapter.js";
import { matchesPattern } from "../repair/repairUtils.js";
export function buildChangeScope(input) {
    const allowed = new Map();
    const review = new Map();
    const forbidden = new Map();
    // 1. Forbidden Bucket (Default Policies)
    const defaultForbidden = [
        ".pantheon/audit/**",
        ".pantheon/reviews/**",
        ".pantheon/repair/**/human_decision*.json",
        ".pantheon/**/approval*.json",
        ".cursor/**",
        ".git/**"
    ];
    for (const pattern of defaultForbidden) {
        forbidden.set(pattern, {
            path_pattern: pattern,
            bucket: "forbidden",
            reason_kind: "trust_sensitive",
            rationale: "Pantheon trust and audit artifacts are strictly forbidden from automated modification.",
            source: "default_rule",
        });
    }
    // 2. Review Required Bucket (Default Policies)
    const defaultReview = [
        "package.json",
        "package-lock.json",
        "yarn.lock",
        "pnpm-lock.yaml",
        ".github/workflows/**",
        "tsconfig*.json",
        "vitest.config.*",
        "dist/**",
        "action/dist/**"
    ];
    for (const pattern of defaultReview) {
        review.set(pattern, {
            path_pattern: pattern,
            bucket: "review_required",
            reason_kind: "config_surface",
            rationale: "Project configuration and manifests require review.",
            source: "default_rule",
        });
    }
    // 3. User Intents (Allowed)
    for (const target of input.intake.target_patterns) {
        allowed.set(target, {
            path_pattern: target,
            bucket: "allowed",
            reason_kind: "declared_target",
            rationale: "User declared target for this change.",
            source: "user_intent",
        });
    }
    // 4. Test Co-location (Allowed)
    // For each declared target, we generously allow test files nearby if they are simple paths
    for (const target of input.intake.target_patterns) {
        if (!target.includes("**")) {
            const extMatch = target.match(/\.([a-z]+)$/i);
            if (extMatch) {
                const base = target.substring(0, target.length - extMatch[0].length);
                const testPattern = `${base}.test${extMatch[0]}`;
                const specPattern = `${base}.spec${extMatch[0]}`;
                allowed.set(testPattern, {
                    path_pattern: testPattern,
                    bucket: "allowed",
                    reason_kind: "test_mapping",
                    rationale: "Inferred co-located test file for declared target.",
                    source: "default_rule",
                });
                allowed.set(specPattern, {
                    path_pattern: specPattern,
                    bucket: "allowed",
                    reason_kind: "test_mapping",
                    rationale: "Inferred co-located spec file for declared target.",
                    source: "default_rule",
                });
            }
        }
    }
    // 5. Change Type Specifics
    if (input.intake.change_type === "architecture_change") {
        // If it's an architecture change, all targets become review_required
        for (const target of allowed.keys()) {
            review.set(target, {
                path_pattern: target,
                bucket: "review_required",
                reason_kind: "architecture_reserved",
                rationale: "Architecture changes always require human review.",
                source: "default_rule",
            });
            allowed.delete(target);
        }
    }
    // 6. Architecture Contract Constraints (P30)
    //
    // Merge BEFORE precedence resolution so that:
    //   architecture forbidden + user allowed => forbidden wins
    //   architecture review    + user allowed => review wins
    //   architecture ownership + matching target => allowed
    //
    if (input.architectureContract) {
        const archResult = adaptArchitectureConstraints({
            contract: input.architectureContract,
            targetSubjects: input.targetSubjects ?? [],
            targetPathPatterns: input.intake.target_patterns,
        });
        for (const entry of archResult.entries) {
            switch (entry.bucket) {
                case "forbidden":
                    forbidden.set(entry.path_pattern, entry);
                    break;
                case "review_required":
                    review.set(entry.path_pattern, entry);
                    break;
                case "allowed":
                    // Only set if not already in a higher-precedence bucket
                    if (!forbidden.has(entry.path_pattern) && !review.has(entry.path_pattern)) {
                        allowed.set(entry.path_pattern, entry);
                    }
                    break;
            }
        }
    }
    // Precedence: forbidden > review > allowed
    const forbidPatterns = [...forbidden.keys()];
    const reviewPatterns = [...review.keys()];
    for (const pattern of [...allowed.keys()]) {
        if (forbidPatterns.some(forbid => matchesPattern(pattern, forbid)) ||
            reviewPatterns.some(revPattern => matchesPattern(pattern, revPattern))) {
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
function sortEntries(entries) {
    return [...entries.values()].sort((a, b) => a.path_pattern.localeCompare(b.path_pattern));
}
//# sourceMappingURL=changeScopeBuilder.js.map