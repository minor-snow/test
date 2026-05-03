import { resolveChangeVerdict } from "./changeVerdictResolver.js";
import { matchesPattern } from "../repair/repairUtils.js";
import { isMixedBootstrapAndRepair } from "../alpha/bootstrapScope.js";
export function verifyChangeDiff(input) {
    const findings = [];
    const changedPaths = input.diff.changed_files.map(f => f.path);
    const bucket_counts = {
        allowed: 0,
        review_required: 0,
        forbidden: 0,
        outside_scope: 0,
    };
    // 1. Check for Base SHA match
    if (input.contract.repo_state.base_sha !== input.diff.base_ref && input.diff.base_ref !== "HEAD") {
        findings.push({
            kind: "stale_base_sha",
            message: `The change contract was planned against base ${input.contract.repo_state.base_sha}, but current base is ${input.diff.base_ref}.`,
            severity: "warning",
        });
    }
    // 2. Check for mixed bootstrap scope (reusing the alpha/bootstrapScope logic)
    if (isMixedBootstrapAndRepair(changedPaths)) {
        findings.push({
            kind: "bootstrap_scope_mixed_with_change",
            message: "This change modifies both governance bootstrap configurations and regular source files. They must be isolated.",
            severity: "warning",
            files: changedPaths.filter(p => p.includes(".pantheon") || p.includes("AGENTS.md")),
        });
    }
    // 3. Bucket File Classification
    const outsideScopeFiles = [];
    const forbiddenFiles = [];
    const archForbiddenFiles = [];
    const reviewRequiredFiles = [];
    const archReviewRequiredFiles = [];
    for (const file of changedPaths) {
        let matched = false;
        // Check Forbidden
        const forbiddenMatch = input.contract.scope.forbidden.find(e => matchesPattern(file, e.path_pattern));
        if (forbiddenMatch) {
            if (forbiddenMatch.reason_kind.startsWith("architecture_"))
                archForbiddenFiles.push(file);
            else
                forbiddenFiles.push(file);
            bucket_counts.forbidden++;
            matched = true;
        }
        // Check Review Required
        else {
            const reviewMatch = input.contract.scope.review_required.find(e => matchesPattern(file, e.path_pattern));
            if (reviewMatch) {
                if (reviewMatch.reason_kind.startsWith("architecture_"))
                    archReviewRequiredFiles.push(file);
                else
                    reviewRequiredFiles.push(file);
                bucket_counts.review_required++;
                matched = true;
            }
            // Check Allowed
            else if (input.contract.scope.allowed.some(e => matchesPattern(file, e.path_pattern))) {
                bucket_counts.allowed++;
                matched = true;
            }
        }
        if (!matched) {
            outsideScopeFiles.push(file);
            bucket_counts.outside_scope++;
        }
    }
    if (forbiddenFiles.length > 0) {
        findings.push({
            kind: "forbidden_file",
            message: "Modifications detected in forbidden paths.",
            severity: "error",
            files: forbiddenFiles,
        });
    }
    if (archForbiddenFiles.length > 0) {
        findings.push({
            kind: "architecture_forbidden",
            message: "Modifications detected in architecture-forbidden paths.",
            severity: "error",
            files: archForbiddenFiles,
        });
    }
    if (reviewRequiredFiles.length > 0) {
        findings.push({
            kind: "review_required_file",
            message: "Modifications detected in paths requiring review.",
            severity: "info",
            files: reviewRequiredFiles,
        });
    }
    if (archReviewRequiredFiles.length > 0) {
        findings.push({
            kind: "architecture_review_required",
            message: "Modifications detected in architecture paths requiring review.",
            severity: "info",
            files: archReviewRequiredFiles,
        });
    }
    if (outsideScopeFiles.length > 0) {
        findings.push({
            kind: "outside_scope_file",
            message: "Modifications detected outside the planned contract scope.",
            severity: "warning",
            files: outsideScopeFiles,
        });
    }
    // 4. Test Weakening Heuristic
    if (input.contract.change_type === "test_change") {
        // simplified heuristic
        const hasSkip = false; // In a real implementation we would read the diff content
        if (hasSkip) {
            findings.push({
                kind: "test_weakening",
                message: "Potential test weakening detected (e.g. .skip).",
                severity: "warning",
            });
        }
    }
    // 5. Architecture Change always requires review
    if (input.contract.change_type === "architecture_change") {
        findings.push({
            kind: "architecture_change_type",
            message: "Architecture changes require explicit review.",
            severity: "info",
        });
    }
    const verdict = resolveChangeVerdict(findings);
    const nextActions = [];
    if (verdict === "requires_scope_expansion") {
        nextActions.push("Remove out-of-scope file(s)");
        nextActions.push("OR re-run change plan with expanded target");
    }
    else if (verdict === "requires_replan") {
        nextActions.push("Re-run 'pantheon change plan' due to stale repository state.");
    }
    else if (verdict === "fail") {
        nextActions.push("Revert forbidden file changes immediately.");
    }
    return {
        schema_version: "change_check@0.1.0",
        change_id: input.contract.change_id,
        verdict,
        changed_files: changedPaths,
        findings,
        bucket_counts,
        next_actions: nextActions,
    };
}
//# sourceMappingURL=changeVerifier.js.map