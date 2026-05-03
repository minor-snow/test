/**
 * P29.5: Contract Requirement Policy
 *
 * Determines whether a diff REQUIRES a contract based on structural risk.
 * This is a pure function: no git/filesystem access, no side effects.
 *
 * Input: changed file paths + repo observation context.
 * Output: per-file risk classification + overall contract requirement.
 *
 * Risk model:
 *   - Low:      docs-only, comments-only, formatting-only, small test-only → no contract required
 *   - Medium:   source code, non-core modules, minor config → contract required
 *   - High:     auth, payment, security, public API, package.json scripts/exports, workflows → contract required
 *   - Critical: forbidden paths, policy bypass → fail
 *
 * ref: P29.5 section 10
 */
import { matchesGlob } from "../globMatch.js";
// ---------------------------------------------------------------------------
// Known patterns
// ---------------------------------------------------------------------------
const DOCS_PATTERNS = [
    "*.md",
    "**/*.md",
    "docs/**",
    "CHANGELOG",
    "CHANGELOG.*",
    "LICENSE",
    "LICENSE.*",
    "CONTRIBUTING",
    "CONTRIBUTING.*",
];
const TEST_PATTERNS = [
    "test/**",
    "tests/**",
    "__tests__/**",
    "**/*.test.*",
    "**/*.spec.*",
    "**/test_*",
    "**/*_test.*",
];
const CONFIG_PATTERNS = [
    "*.config.*",
    ".eslintrc*",
    ".prettierrc*",
    "tsconfig*.json",
    "vitest.config.*",
    "jest.config.*",
    ".editorconfig",
    ".gitignore",
    ".gitattributes",
];
const GENERATED_PATTERNS = [
    "dist/**",
    "build/**",
    "coverage/**",
    "action/dist/**",
    "*.min.js",
    "*.min.css",
    "*.bundle.*",
];
const WORKFLOW_PATTERNS = [
    ".github/workflows/**",
    "action.yml",
    "action/action.yml",
];
const POLICY_PATTERNS = [
    "AGENTS.md",
    "pantheon.json",
    "pantheon.alpha.json",
    "pantheon.agent.json",
    ".pantheon/policy/**",
    ".pantheon/architecture/**",
    "CODEOWNERS",
];
const CONTRACT_ARTIFACT_PATTERNS = [
    ".pantheon/repair/**",
    ".pantheon/change/**",
];
const APPROVAL_ARTIFACT_PATTERNS = [
    ".pantheon/audit/**",
    ".pantheon/reviews/**",
];
/**
 * High-risk path keywords that escalate risk level within source files.
 * These are checked against the full path, not just the filename.
 */
const HIGH_RISK_KEYWORDS = [
    "auth",
    "payment",
    "billing",
    "security",
    "crypto",
    "secret",
    "migration",
    "deploy",
    "infra",
    "permission",
    "rbac",
    "oauth",
    "token",
    "session",
    "middleware",
];
/**
 * Package manifest files that affect execution surfaces.
 */
const PACKAGE_EXECUTION_FILES = [
    "package.json",
    "pyproject.toml",
    "setup.py",
    "setup.cfg",
    "Cargo.toml",
    "go.mod",
];
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export function evaluateContractRequirement(input) {
    const config = input.policyConfig ?? {};
    const threshold = config.risk_threshold_for_contract ?? "medium";
    const lowRiskBypass = config.low_risk_bypass ?? { enabled: true };
    const fileFindings = [];
    for (const path of input.changedPaths) {
        const finding = classifyFile(path, {
            protectedPaths: input.protectedPaths,
            reviewRequiredPaths: input.reviewRequiredPaths,
            generatedPaths: input.generatedPaths,
        });
        fileFindings.push(finding);
    }
    // Aggregate risk level (max across all files)
    const overallRisk = aggregateRisk(fileFindings);
    // Check low-risk bypass
    const bypassApplicable = lowRiskBypass.enabled !== false
        && canBypass(fileFindings, lowRiskBypass);
    // Contract required if risk >= threshold and bypass not applicable
    const contractRequired = !bypassApplicable
        && riskMeetsThreshold(overallRisk, threshold);
    return {
        risk_level: overallRisk,
        contract_required: contractRequired,
        contract_reason: contractRequired
            ? buildContractReason(fileFindings, overallRisk)
            : undefined,
        low_risk_bypass_applied: bypassApplicable && riskMeetsThreshold(overallRisk, threshold),
        file_findings: fileFindings,
    };
}
// ---------------------------------------------------------------------------
// File classification
// ---------------------------------------------------------------------------
function classifyFile(path, ctx) {
    const reasons = [];
    // Forbidden / protected
    if (ctx.protectedPaths?.some(p => matchesGlob(path, p))) {
        return makeFileFinding(path, "forbidden", "critical", ["Protected path"], true, true);
    }
    // Policy-sensitive
    if (matchesAny(path, POLICY_PATTERNS)) {
        return makeFileFinding(path, "policy_sensitive", "high", ["Governance policy file"], true, true);
    }
    // Approval artifact
    if (matchesAny(path, APPROVAL_ARTIFACT_PATTERNS)) {
        return makeFileFinding(path, "contract_artifact", "critical", ["Approval/audit artifact — cannot be self-authored trust source"], true, true);
    }
    // Contract artifact
    if (matchesAny(path, CONTRACT_ARTIFACT_PATTERNS)) {
        return makeFileFinding(path, "contract_artifact", "high", ["Contract artifact — PR-authored modifications are not trusted"], true, false);
    }
    // Workflow
    if (matchesAny(path, WORKFLOW_PATTERNS)) {
        return makeFileFinding(path, "workflow", "high", ["CI/CD workflow file"], true, true);
    }
    // Generated / build artifacts
    if (matchesAny(path, GENERATED_PATTERNS) || ctx.generatedPaths?.some(p => matchesGlob(path, p))) {
        return makeFileFinding(path, "generated_artifact", "high", ["Generated/bundled artifact — requires rebuild verification"], true, false);
    }
    // Review-required from config
    if (ctx.reviewRequiredPaths?.some(p => matchesGlob(path, p))) {
        reasons.push("Marked review_required in policy");
        return makeFileFinding(path, "review_required", "medium", reasons, true, false);
    }
    // Package execution surface
    if (PACKAGE_EXECUTION_FILES.some(f => path === f || path.endsWith(`/${f}`))) {
        return makeFileFinding(path, "source", "high", ["Package manifest — scripts/bin/exports affect execution surface"], true, false);
    }
    // Docs
    if (matchesAny(path, DOCS_PATTERNS)) {
        return makeFileFinding(path, "docs", "low", ["Documentation file"], false, false);
    }
    // Tests
    if (matchesAny(path, TEST_PATTERNS)) {
        // Check if test touches high-risk zones
        const highRisk = HIGH_RISK_KEYWORDS.some(kw => path.toLowerCase().includes(kw));
        if (highRisk) {
            return makeFileFinding(path, "test", "medium", ["Test file in high-risk area"], false, false);
        }
        return makeFileFinding(path, "test", "low", ["Test file"], false, false);
    }
    // Config files
    if (matchesAny(path, CONFIG_PATTERNS)) {
        return makeFileFinding(path, "source", "low", ["Configuration file"], false, false);
    }
    // Source code — check for high-risk keywords
    const highRiskKeywords = HIGH_RISK_KEYWORDS.filter(kw => path.toLowerCase().includes(kw));
    if (highRiskKeywords.length > 0) {
        reasons.push(`Source file in high-risk area: ${highRiskKeywords.join(", ")}`);
        return makeFileFinding(path, "source", "high", reasons, true, false);
    }
    // Default source code
    return makeFileFinding(path, "source", "medium", ["Source code file"], true, false);
}
function makeFileFinding(path, bucket, riskLevel, reasons, contractRequired, trustedApprovalRequired) {
    return { path, bucket, risk_level: riskLevel, reasons, contract_required: contractRequired, trusted_approval_required: trustedApprovalRequired };
}
// ---------------------------------------------------------------------------
// Risk aggregation
// ---------------------------------------------------------------------------
const RISK_ORDER = {
    low: 0,
    medium: 1,
    high: 2,
    critical: 3,
};
function aggregateRisk(findings) {
    if (findings.length === 0)
        return "low";
    let max = "low";
    for (const f of findings) {
        if (RISK_ORDER[f.risk_level] > RISK_ORDER[max]) {
            max = f.risk_level;
        }
    }
    return max;
}
function riskMeetsThreshold(risk, threshold) {
    const thresholdRank = RISK_ORDER[threshold] ?? 1;
    return RISK_ORDER[risk] >= thresholdRank;
}
// ---------------------------------------------------------------------------
// Low-risk bypass
// ---------------------------------------------------------------------------
function canBypass(findings, config) {
    if (findings.length === 0)
        return true;
    const allDocs = findings.every(f => f.bucket === "docs");
    if (allDocs && config.docs_only !== false)
        return true;
    const allTests = findings.every(f => f.bucket === "test");
    if (allTests && config.test_only === "allow_low_risk") {
        // Only bypass if all tests are low risk
        return findings.every(f => f.risk_level === "low");
    }
    const allLow = findings.every(f => f.risk_level === "low");
    if (allLow)
        return true;
    return false;
}
// ---------------------------------------------------------------------------
// Reason builder
// ---------------------------------------------------------------------------
function buildContractReason(findings, riskLevel) {
    const sourceFiles = findings.filter(f => f.bucket === "source" && f.contract_required);
    const policyFiles = findings.filter(f => f.bucket === "policy_sensitive");
    const workflowFiles = findings.filter(f => f.bucket === "workflow");
    const generatedFiles = findings.filter(f => f.bucket === "generated_artifact");
    const parts = [];
    if (sourceFiles.length > 0) {
        parts.push(`${sourceFiles.length} source file(s) changed`);
    }
    if (policyFiles.length > 0) {
        parts.push(`${policyFiles.length} governance policy file(s) modified`);
    }
    if (workflowFiles.length > 0) {
        parts.push(`${workflowFiles.length} workflow file(s) modified`);
    }
    if (generatedFiles.length > 0) {
        parts.push(`${generatedFiles.length} generated artifact(s) modified`);
    }
    if (parts.length === 0) {
        return `${riskLevel}-risk changes detected without a valid contract.`;
    }
    return `${parts.join("; ")} — ${riskLevel}-risk changes require a valid contract.`;
}
// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------
function matchesAny(path, patterns) {
    return patterns.some(p => p === path || matchesGlob(path, p));
}
//# sourceMappingURL=contractRequirementPolicy.js.map