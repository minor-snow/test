/**
 * P30: Architecture Constraint Evaluator
 *
 * Given a set of changed files and an architecture contract, produces
 * ArchitectureFinding[] that are fed into the change/repair verifier.
 *
 * Key behaviors:
 * - Global constraints (forbidden/review) apply to all changes
 * - Contextual ownership constraints detect scope crossings
 * - must_not_depend_on detects when both sides of a boundary are touched
 * - Advisory relations produce info-level findings, never blocking
 * - architecture_contract.json modification is always flagged
 *
 * WORDING INVARIANT (must_not_depend_on):
 *   Never say "X depends on Y."
 *   Say "This diff touches both sides of a must-not-depend boundary."
 *   P30 has no import graph to prove real dependency violations.
 *
 * ref: P30
 */
import { ADVISORY_ONLY_RELATIONS } from "./types.js";
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
/**
 * Evaluate changed files against architecture constraints.
 *
 * Produces findings that inform the change/repair verifier.
 * Findings are ordered by severity: blocking > review > info.
 */
export function evaluateArchitectureConstraints(input) {
    const findings = [];
    const { contract, changedFiles, targetSubjects, architectureContractModified } = input;
    const normalizedTargets = targetSubjects.map(s => s.toLowerCase().trim());
    // 1. Check architecture contract self-modification
    if (architectureContractModified) {
        findings.push({
            kind: "architecture_contract_modified",
            message: "Architecture contract was modified in this diff. Current evaluation uses the base branch contract.",
            files: [".pantheon/architecture/architecture_contract.json"],
            severity: "review",
        });
    }
    // 2. Evaluate global constraints against changed files
    for (const constraint of contract.constraints) {
        if (constraint.constraint_tier === "global") {
            const matched = findMatchingFiles(changedFiles, constraint.path_patterns);
            if (matched.length > 0) {
                findings.push(buildGlobalFinding(constraint, matched));
            }
        }
    }
    // 3. Evaluate contextual ownership — detect scope crossings
    const contextualConstraints = contract.constraints.filter(c => c.constraint_tier === "contextual");
    const ownershipBySubject = groupBySubject(contextualConstraints);
    for (const [subject, constraints] of ownershipBySubject) {
        const subjectMatches = normalizedTargets.some(t => t === subject.toLowerCase().trim());
        if (!subjectMatches) {
            // This is NOT the target module — check if any changed files fall in its paths
            for (const constraint of constraints) {
                const matched = findMatchingFiles(changedFiles, constraint.path_patterns);
                if (matched.length > 0) {
                    findings.push({
                        kind: "architecture_scope_crossed",
                        message: `Change target does not include "${subject}", but diff touches files owned by it. ` +
                            `This may require scope expansion or architecture review.`,
                        files: matched,
                        severity: "review",
                        constraint_id: constraint.constraint_id,
                        subject,
                    });
                }
            }
        }
    }
    // 4. Evaluate must_not_depend_on (both-sides-touched detection)
    const mustNotDependConstraints = contract.constraints.filter(c => c.constraint_type === "must_not_touch_together");
    for (const constraint of mustNotDependConstraints) {
        // Find the source relation to get both sides
        const sourceRel = contract.accepted_relations.find(r => constraint.source_relation_ids.includes(r.relation_id));
        if (!sourceRel)
            continue;
        const subjectPaths = getPathsForSubject(contract, sourceRel.subject);
        const objectPaths = getPathsForSubject(contract, sourceRel.object);
        const subjectTouched = findMatchingFiles(changedFiles, subjectPaths);
        const objectTouched = findMatchingFiles(changedFiles, objectPaths);
        if (subjectTouched.length > 0 && objectTouched.length > 0) {
            findings.push({
                kind: "architecture_dependency_boundary_review",
                // WORDING: Never claim real dependency — only boundary touch
                message: `This diff touches both sides of a declared must-not-depend boundary ` +
                    `between "${sourceRel.subject}" and "${sourceRel.object}". Review required.`,
                files: [...subjectTouched, ...objectTouched],
                severity: "review",
                constraint_id: constraint.constraint_id,
                subject: sourceRel.subject,
                object: sourceRel.object,
            });
        }
    }
    // 5. Advisory-only: informational findings from advisory relations
    const advisorySet = new Set(ADVISORY_ONLY_RELATIONS);
    for (const rel of contract.accepted_relations) {
        if (!advisorySet.has(rel.relation_type))
            continue;
        if (rel.path_patterns.length === 0)
            continue;
        const matched = findMatchingFiles(changedFiles, rel.path_patterns);
        if (matched.length > 0) {
            findings.push({
                kind: "architecture_advisory",
                message: `Advisory: "${rel.subject}" has a "${rel.relation_type}" relation with "${rel.object}". ` +
                    `Files in this diff match its path patterns.`,
                files: matched,
                severity: "info",
                subject: rel.subject,
                object: rel.object,
            });
        }
    }
    // Sort by severity: blocking > review > info
    const severityOrder = { blocking: 0, review: 1, info: 2 };
    findings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
    return {
        findings,
        summary: {
            total: findings.length,
            blocking: findings.filter(f => f.severity === "blocking").length,
            review: findings.filter(f => f.severity === "review").length,
            info: findings.filter(f => f.severity === "info").length,
        },
    };
}
// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------
function buildGlobalFinding(constraint, matchedFiles) {
    switch (constraint.constraint_type) {
        case "forbidden_path":
            return {
                kind: "architecture_forbidden_path",
                message: `Architecture contract forbids changes to paths matching "${constraint.path_patterns.join(", ")}" (subject: ${constraint.subject}).`,
                files: matchedFiles,
                severity: "blocking",
                constraint_id: constraint.constraint_id,
                subject: constraint.subject,
            };
        case "review_required_path":
            return {
                kind: "architecture_boundary_crossed",
                message: `Architecture contract requires review for changes to "${constraint.path_patterns.join(", ")}" (subject: ${constraint.subject}).`,
                files: matchedFiles,
                severity: "review",
                constraint_id: constraint.constraint_id,
                subject: constraint.subject,
            };
        case "external_boundary_review":
            return {
                kind: "architecture_external_boundary_review",
                message: `Architecture contract: external service boundary "${constraint.subject}" was touched.`,
                files: matchedFiles,
                severity: "review",
                constraint_id: constraint.constraint_id,
                subject: constraint.subject,
            };
        case "must_not_touch_together":
            // This case is handled separately in the main loop
            return {
                kind: "architecture_dependency_boundary_review",
                message: `Must-not-depend boundary touched for "${constraint.subject}".`,
                files: matchedFiles,
                severity: "review",
                constraint_id: constraint.constraint_id,
                subject: constraint.subject,
            };
        default:
            return {
                kind: "architecture_advisory",
                message: `Architecture constraint triggered for "${constraint.subject}".`,
                files: matchedFiles,
                severity: "info",
                constraint_id: constraint.constraint_id,
                subject: constraint.subject,
            };
    }
}
/**
 * Find files that match any of the given path patterns.
 * Uses simple prefix/glob matching.
 */
function findMatchingFiles(files, patterns) {
    if (patterns.length === 0)
        return [];
    const matched = [];
    for (const file of files) {
        for (const pattern of patterns) {
            if (fileMatchesPattern(file, pattern)) {
                matched.push(file);
                break;
            }
        }
    }
    return matched;
}
/**
 * Simple pattern matching:
 * - "src/billing/**" matches "src/billing/invoice.ts"
 * - "src/billing/types.ts" matches exactly
 * - "src/billing/" matches anything under that directory
 */
function fileMatchesPattern(file, pattern) {
    // Exact match
    if (file === pattern)
        return true;
    // Glob suffix match
    if (pattern.endsWith("/**")) {
        const prefix = pattern.slice(0, -3); // Remove /**
        return file.startsWith(prefix + "/") || file === prefix;
    }
    // Directory prefix match
    if (pattern.endsWith("/")) {
        return file.startsWith(pattern);
    }
    // Wildcard match
    if (pattern.includes("*")) {
        const regex = new RegExp("^" + pattern.replace(/\./g, "\\.").replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*") + "$");
        return regex.test(file);
    }
    return false;
}
function groupBySubject(constraints) {
    const map = new Map();
    for (const c of constraints) {
        const list = map.get(c.subject) ?? [];
        list.push(c);
        map.set(c.subject, list);
    }
    return map;
}
/**
 * Get all path patterns associated with a subject from the contract.
 */
function getPathsForSubject(contract, subject) {
    const paths = new Set();
    for (const rel of contract.accepted_relations) {
        if (rel.subject === subject || rel.object === subject) {
            for (const p of rel.path_patterns) {
                paths.add(p);
            }
        }
    }
    return [...paths];
}
//# sourceMappingURL=architectureConstraintEvaluator.js.map