/**
 * P29.5: Contract Gate Evaluator
 *
 * Top-level orchestrator for the Contract Required Gate.
 * Composes all P29.5 modules into a single deterministic evaluation pipeline:
 *
 *   1. Load base-branch policy
 *   2. Detect policy tamper
 *   3. Guard PR-authored artifacts
 *   4. Evaluate contract requirement (risk classification)
 *   5. Resolve active contract
 *   6. Resolve trusted approval (if provided)
 *   7. Produce ContractGateResult with verdict, findings, and required actions
 *
 * Verdict precedence:
 *   fail > requires_replan > requires_contract > requires_review > pass
 *
 * The gate evaluator runs BEFORE the existing repair/change pipeline.
 * If verdict is fail/requires_contract/requires_replan, the pipeline short-circuits.
 * If verdict is pass/requires_review, the existing pipeline continues.
 * The final public verdict = max(gate verdict, pipeline verdict).
 *
 * ref: P29.5 section 4, implementation plan
 */
import { loadBasePolicy } from "./baseBranchPolicyLoader.js";
import { detectPolicyTamper, hasPolicySensitiveChanges } from "./policyTamperDetector.js";
import { guardPrAuthoredArtifacts } from "../trust/prAuthoredArtifactGuard.js";
import { evaluateContractRequirement } from "./contractRequirementPolicy.js";
import { resolveActiveContract } from "../contract/activeContractResolver.js";
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export function evaluateContractGate(input) {
    const { repoRoot, changedPaths, baseSha, baseRef, policySourceOverride, trustedApproval } = input;
    // 1. Load base-branch policy
    const policyResult = loadBasePolicy({
        repoRoot,
        baseSha,
        baseRef,
        policySourceOverride,
    });
    const config = policyResult.config;
    const gateConfig = config?.contract_gate;
    // If gate is explicitly disabled, pass through
    if (gateConfig?.enabled === false) {
        return buildPassthrough(policyResult.source, changedPaths);
    }
    // 2. Detect policy tamper
    const tamperResult = detectPolicyTamper(changedPaths, {
        protectedPolicyPaths: gateConfig?.protected_policy_paths
            ? [...gateConfig.protected_policy_paths]
            : undefined,
        contractArtifactPaths: gateConfig?.contract_artifact_paths
            ? [...gateConfig.contract_artifact_paths]
            : undefined,
    });
    // 3. Guard PR-authored artifacts
    const artifactGuard = guardPrAuthoredArtifacts(changedPaths);
    // 4. Evaluate contract requirement
    const requirement = evaluateContractRequirement({
        changedPaths,
        policyConfig: gateConfig,
        protectedPaths: config?.protected ? [...config.protected] : undefined,
        reviewRequiredPaths: config?.review_required ? [...config.review_required] : undefined,
        generatedPaths: config?.generated ? [...config.generated] : undefined,
    });
    // 5. Resolve active contract
    const contractResolution = resolveActiveContract({
        repoRoot,
        prChangedPaths: changedPaths,
        baseSha,
    });
    // 6. Build findings
    const allFindings = [];
    // Policy tamper findings
    if (tamperResult.detected) {
        for (const tamperFinding of tamperResult.findings) {
            allFindings.push({
                kind: "policy_tamper",
                severity: tamperFinding.classification === "policy_sensitive" ? "blocking" : "warning",
                path: tamperFinding.path,
                message: tamperFinding.message,
                action: tamperFinding.classification === "policy_sensitive"
                    ? "request_review" : "none",
            });
        }
    }
    // Artifact guard findings
    allFindings.push(...artifactGuard.findings);
    // Base policy missing finding
    if (policyResult.source.status === "missing") {
        allFindings.push({
            kind: "base_policy_missing",
            severity: "warning",
            message: "Base branch policy not found. Using conservative defaults.",
            action: "none",
        });
    }
    // Contract status findings
    if (requirement.contract_required && contractResolution.status === "missing") {
        allFindings.push({
            kind: "missing_contract",
            severity: "blocking",
            message: requirement.contract_reason ?? "No valid contract found for risky changes.",
            action: "create_contract",
        });
    }
    else if (contractResolution.status === "stale") {
        allFindings.push({
            kind: "stale_contract",
            severity: "blocking",
            message: contractResolution.reason,
            action: "request_replan",
        });
    }
    else if (contractResolution.status === "untrusted_pr_authored") {
        allFindings.push({
            kind: "pr_authored_contract_ignored",
            severity: "blocking",
            message: contractResolution.reason,
            action: "request_replan",
        });
    }
    // Low-risk bypass finding
    if (requirement.low_risk_bypass_applied) {
        allFindings.push({
            kind: "low_risk_bypass_applied",
            severity: "info",
            message: "Low-risk bypass applied — no contract required.",
            action: "none",
        });
    }
    // Missing trusted approval for review-required files
    if (hasPolicySensitiveChanges(tamperResult) && (!trustedApproval || !trustedApproval.trusted)) {
        allFindings.push({
            kind: "trusted_approval_missing",
            severity: "blocking",
            message: "Policy-sensitive changes require trusted maintainer approval.",
            action: "request_review",
        });
    }
    // 7. Determine verdict
    const verdict = determineVerdict({
        requirement,
        contractStatus: contractResolution.status,
        tamperDetected: tamperResult.detected,
        fakeApprovalDetected: artifactGuard.fake_approval_detected,
        trustedApproval,
        hasPolicyChanges: hasPolicySensitiveChanges(tamperResult),
    });
    // 8. Build required action block
    const requiredAction = buildRequiredAction(verdict, allFindings);
    // 9. Build metrics
    const metrics = {
        uncontracted_change_detected: requirement.contract_required && contractResolution.status === "missing",
        policy_tamper_detected: tamperResult.detected,
        fake_approval_ignored: artifactGuard.fake_approval_detected,
        high_risk_surface_touched: requirement.risk_level === "high" || requirement.risk_level === "critical",
    };
    return {
        schema: "pantheon.contract_gate_result.v1",
        verdict,
        risk_level: requirement.risk_level,
        contract_status: contractResolution.status,
        policy_source: policyResult.source,
        changed_files: requirement.file_findings,
        findings: allFindings,
        trusted_approval: trustedApproval,
        required_action: requiredAction,
        metrics,
    };
}
// ---------------------------------------------------------------------------
// Verdict determination
// ---------------------------------------------------------------------------
function determineVerdict(ctx) {
    // Critical: fake approval → fail
    if (ctx.fakeApprovalDetected) {
        return "fail";
    }
    // Stale or PR-authored contract → requires_replan
    if (ctx.contractStatus === "stale" || ctx.contractStatus === "revision_mismatch"
        || ctx.contractStatus === "base_sha_mismatch") {
        return "requires_replan";
    }
    // PR-authored contract → requires_replan
    if (ctx.contractStatus === "untrusted_pr_authored") {
        return "requires_replan";
    }
    // Contract required but missing
    if (ctx.requirement.contract_required && ctx.contractStatus === "missing") {
        // Check if trusted approval can satisfy
        if (ctx.trustedApproval?.trusted) {
            // Trusted approval can downgrade requires_contract → requires_review
            return "requires_review";
        }
        return "requires_contract";
    }
    // Policy changes → requires_review (even if contract exists)
    if (ctx.hasPolicyChanges) {
        return "requires_review";
    }
    // Tamper detected (workflow, artifacts) → requires_review
    if (ctx.tamperDetected) {
        return "requires_review";
    }
    // Low-risk bypass
    if (ctx.requirement.low_risk_bypass_applied) {
        return "pass";
    }
    // Contract exists and valid
    if (ctx.contractStatus === "valid") {
        return "pass";
    }
    // No contract required (all low risk)
    if (!ctx.requirement.contract_required) {
        return "pass";
    }
    // Fallback — should not reach here, but fail-closed
    return "requires_contract";
}
// ---------------------------------------------------------------------------
// Required action builder
// ---------------------------------------------------------------------------
function buildRequiredAction(verdict, findings) {
    const why = [];
    const next = [];
    for (const finding of findings) {
        if (finding.severity === "blocking" || finding.severity === "critical") {
            why.push(finding.message);
        }
    }
    switch (verdict) {
        case "fail":
            if (why.length === 0)
                why.push("Critical governance violation detected.");
            next.push("Review the findings above and address the violations.");
            next.push("Remove any PR-authored approval artifacts.");
            break;
        case "requires_replan":
            if (why.length === 0)
                why.push("Contract is stale or was modified in this PR.");
            next.push("Run: pantheon-alpha repair plan --repair-id <id>");
            next.push("Re-run Pantheon check.");
            break;
        case "requires_contract":
            if (why.length === 0)
                why.push("Source changes detected without a valid contract.");
            next.push("Run: pantheon-alpha change infer --from-diff");
            next.push("Run: pantheon-alpha change plan --change-id <id>");
            next.push("Re-run Pantheon check.");
            next.push("Or request trusted maintainer approval.");
            break;
        case "requires_review":
            if (why.length === 0)
                why.push("Changes require human review.");
            next.push("Request review from a trusted maintainer.");
            next.push("Or add a trusted approval label.");
            break;
        case "pass":
            // No action needed
            break;
    }
    return { why, next };
}
// ---------------------------------------------------------------------------
// Pass-through result (gate disabled)
// ---------------------------------------------------------------------------
function buildPassthrough(policySource, changedPaths) {
    return {
        schema: "pantheon.contract_gate_result.v1",
        verdict: "pass",
        risk_level: "low",
        contract_status: "not_required",
        policy_source: policySource,
        changed_files: changedPaths.map(path => ({
            path,
            bucket: "unknown",
            risk_level: "low",
            reasons: ["Contract gate disabled"],
            contract_required: false,
            trusted_approval_required: false,
        })),
        findings: [],
        required_action: { why: [], next: [] },
        metrics: {
            uncontracted_change_detected: false,
            policy_tamper_detected: false,
            fake_approval_ignored: false,
            high_risk_surface_touched: false,
        },
    };
}
//# sourceMappingURL=contractGateEvaluator.js.map