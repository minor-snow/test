/**
 * P29.5: Policy Tamper Detector
 *
 * Detects when a diff touches governance-sensitive files.
 * These files define Pantheon's enforcement rules, workflows,
 * or artifact trust boundaries.
 *
 * When tamper is detected:
 *   - The base-branch policy is used for evaluation (not the modified version).
 *   - A finding is emitted for human review.
 *   - The verdict escalates to at least `requires_review`.
 *
 * Checks both ADDED and MODIFIED files (implementation guard #4).
 *
 * ref: P29.5 INV-3, section 8
 */
import { matchesGlob } from "../globMatch.js";
// ---------------------------------------------------------------------------
// Default protected path patterns
// ---------------------------------------------------------------------------
const DEFAULT_POLICY_SENSITIVE = [
    "AGENTS.md",
    "pantheon.json",
    "pantheon.alpha.json",
    "pantheon.agent.json",
    ".pantheon/policy/**",
    ".pantheon/architecture/**",
    "CODEOWNERS",
];
const DEFAULT_WORKFLOW_SENSITIVE = [
    ".github/workflows/**",
    "action/action.yml",
    "action.yml",
];
const DEFAULT_CONTRACT_ARTIFACT = [
    ".pantheon/repair/runs/**",
    ".pantheon/change/runs/**",
];
const DEFAULT_APPROVAL_ARTIFACT = [
    ".pantheon/audit/**",
    ".pantheon/reviews/**",
];
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
/**
 * Detect policy tamper in a set of changed file paths.
 *
 * @param changedPaths - Repo-relative paths of all files in the diff (added, modified, deleted).
 * @param overrides - Optional custom patterns (from contract_gate config).
 */
export function detectPolicyTamper(changedPaths, overrides) {
    const table = [
        {
            patterns: overrides?.protectedPolicyPaths ?? DEFAULT_POLICY_SENSITIVE,
            classification: "policy_sensitive",
            messagePrefix: "Governance policy file modified",
        },
        {
            patterns: DEFAULT_WORKFLOW_SENSITIVE,
            classification: "workflow_sensitive",
            messagePrefix: "CI/CD workflow file modified",
        },
        {
            patterns: overrides?.contractArtifactPaths ?? DEFAULT_CONTRACT_ARTIFACT,
            classification: "contract_artifact",
            messagePrefix: "Contract artifact modified in PR",
        },
        {
            patterns: DEFAULT_APPROVAL_ARTIFACT,
            classification: "approval_artifact",
            messagePrefix: "Approval/audit artifact modified in PR",
        },
    ];
    const findings = [];
    const seen = new Set();
    for (const path of changedPaths) {
        if (seen.has(path))
            continue;
        for (const entry of table) {
            if (matchesAnyPattern(path, entry.patterns)) {
                seen.add(path);
                findings.push({
                    path,
                    classification: entry.classification,
                    message: `${entry.messagePrefix}: ${path}`,
                });
                break; // First classification wins per file
            }
        }
    }
    return {
        detected: findings.length > 0,
        findings,
    };
}
/**
 * Returns only the policy-sensitive findings (not workflow/artifact).
 * Used to determine if base-branch policy evaluation is mandatory.
 */
export function hasPolicySensitiveChanges(result) {
    return result.findings.some(f => f.classification === "policy_sensitive");
}
/**
 * Returns only the approval-artifact findings.
 * Used by prAuthoredArtifactGuard for trust evaluation.
 */
export function hasApprovalArtifactChanges(result) {
    return result.findings.some(f => f.classification === "approval_artifact");
}
/**
 * Returns only the contract-artifact findings.
 * Used to detect PR-authored contract modifications.
 */
export function hasContractArtifactChanges(result) {
    return result.findings.some(f => f.classification === "contract_artifact");
}
// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------
function matchesAnyPattern(path, patterns) {
    return patterns.some(pattern => {
        // Exact match
        if (pattern === path)
            return true;
        // Glob match
        return matchesGlob(path, pattern);
    });
}
//# sourceMappingURL=policyTamperDetector.js.map