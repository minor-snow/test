/**
 * P22: Diff Feedback Builder
 *
 * Builds structured AgentFeedback from DiffVerificationResult + AgentScopeLite + ChangeContractLite.
 *
 * Design invariants:
 *   - NEVER parses freeform reason/error strings.
 *   - Consumes only structured fields: file_statuses, violation_hints, structured details.
 *   - repair_plan is advisory; allowed_agent_actions is authoritative.
 *   - requires_human = true means agent must not self-resolve.
 */
import { randomUUID } from "node:crypto";
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export function buildAgentFeedbackFromDiffVerification(input) {
    const { verification, scope, contract } = input;
    const violations = [];
    const repairActions = [];
    let violationIdx = 0;
    let repairIdx = 0;
    // Build hint lookup
    const hintsByPath = new Map();
    for (const hint of (scope.violation_hints ?? [])) {
        const existing = hintsByPath.get(hint.path) ?? [];
        existing.push(hint);
        hintsByPath.set(hint.path, existing);
    }
    // Process each file status from verification
    for (const fs of verification.file_statuses) {
        if (fs.status === "forbidden") {
            const v = buildForbiddenViolation(fs.path, violationIdx++);
            violations.push(v);
            repairActions.push(buildRepairAction("revert_file", fs.path, "Revert forbidden file.", "high", true, repairIdx++));
        }
        else if (fs.status === "outside_scope") {
            const v = buildOutsideScopeViolation(fs.path, violationIdx++);
            violations.push(v);
            repairActions.push(buildRepairAction("remove_out_of_scope_change", fs.path, "Remove out-of-scope change or request reverse issue.", "high", true, repairIdx++));
        }
        else if (fs.status === "review_required") {
            // Use violation_hints for structured context
            const hints = hintsByPath.get(fs.path) ?? [];
            if (hints.length > 0) {
                for (const hint of hints) {
                    const v = buildHintViolation(hint, violationIdx++);
                    violations.push(v);
                    const repair = buildRepairFromHint(hint, repairIdx++);
                    if (repair)
                        repairActions.push(repair);
                }
            }
            else {
                // Fallback: generic human review
                violations.push(buildGenericReviewViolation(fs.path, violationIdx++));
                repairActions.push(buildRepairAction("ask_human_review", fs.path, "Request human review.", "medium", true, repairIdx++));
            }
        }
        // "allowed" and "unknown" statuses produce no violations
    }
    // NOTE: We intentionally do NOT generate violations for excluded/invalid files
    // that appear in scope.violation_hints but were NOT in the actual diff.
    // Feedback reflects what the agent actually did, not plan-stage declarations.
    // If an agent correctly avoided an excluded file, it should not be warned.
    // Compute summary
    const summary = {
        violation_count: violations.length,
        blocking_count: violations.filter(v => v.severity === "blocking").length,
        review_required_count: violations.filter(v => v.severity === "review_required").length,
        reverse_issue_required_count: violations.filter(v => v.severity === "reverse_issue_required").length,
        requires_human_count: violations.filter(v => v.requires_human).length,
    };
    // Retry guidance
    const retryGuidance = deriveRetryGuidance(verification.verdict, violations);
    return {
        schema_version: "agent_feedback.v1",
        feedback_id: randomUUID(),
        generated_at: new Date().toISOString(),
        source: {
            phase: "diff_verification",
            source_id: contract.contract_id,
        },
        verdict: verification.verdict,
        summary,
        violations,
        repair_plan: repairActions,
        retry_guidance: retryGuidance,
        human_review_required: violations.some(v => v.requires_human),
    };
}
// ---------------------------------------------------------------------------
// Violation Builders
// ---------------------------------------------------------------------------
function buildForbiddenViolation(path, idx) {
    return {
        violation_id: `v-${idx}`,
        kind: "forbidden_file_modified",
        severity: "reverse_issue_required",
        location: { file_path: path },
        constraint: {
            constraint_id: "scope.forbidden_patterns",
            constraint_kind: "path",
            description: "File matches a forbidden pattern.",
        },
        message: `Forbidden file modified: ${path}`,
        fix_hint: "Revert this file. Do not modify protocol or forbidden files.",
        allowed_agent_actions: ["revert_file"],
        requires_human: true,
    };
}
function buildOutsideScopeViolation(path, idx) {
    return {
        violation_id: `v-${idx}`,
        kind: "outside_scope_file",
        severity: "reverse_issue_required",
        location: { file_path: path },
        constraint: {
            constraint_id: "scope.allowed_files",
            constraint_kind: "scope",
            description: "File is not in the authorized scope.",
        },
        message: `File outside authorized scope: ${path}`,
        fix_hint: "Revert this file or request a Reverse Issue to expand the authorized scope.",
        allowed_agent_actions: ["revert_file", "request_reverse_issue"],
        requires_human: true,
    };
}
function buildGenericReviewViolation(path, idx) {
    return {
        violation_id: `v-${idx}`,
        kind: "requires_human_review",
        severity: "review_required",
        location: { file_path: path },
        constraint: {
            constraint_id: "scope.review_required_files",
            constraint_kind: "human_review",
            description: "File requires manual review.",
        },
        message: `File requires human review: ${path}`,
        fix_hint: "Keep the change scoped and ask for human review before merge.",
        allowed_agent_actions: ["ask_human_review"],
        requires_human: true,
    };
}
function buildHintViolation(hint, idx) {
    const map = {
        missing_test_mapping: {
            kind: "missing_test_mapping",
            severity: "review_required",
            constraintId: "observations.test_mappings",
            constraintKind: "test",
            constraintDesc: "Source file should have related tests.",
            fixHint: "Add a test for this file or configure test_mapping_overrides in pantheon.json.",
            actions: ["add_required_test", "ask_human_review"],
            requiresHuman: false,
        },
        undeclared_package: {
            kind: "undeclared_package",
            severity: "review_required",
            constraintId: "package.declared_dependencies",
            constraintKind: "package",
            constraintDesc: "Imported package should be declared in package.json.",
            fixHint: "Add the dependency to package.json if required, or remove the import.",
            actions: ["update_package_manifest", "remove_change", "ask_human_review"],
            requiresHuman: false,
        },
        not_observed_file: {
            kind: "not_observed_file",
            severity: "review_required",
            constraintId: "observations.files",
            constraintKind: "unknown",
            constraintDesc: "File should be observable by scanner.",
            fixHint: "Ask human review or add path role configuration.",
            actions: ["ask_human_review"],
            requiresHuman: true,
        },
        excluded_file: {
            kind: "excluded_file",
            severity: "reverse_issue_required",
            constraintId: "repo_observation.excluded",
            constraintKind: "path",
            constraintDesc: "Excluded files should not be modified.",
            fixHint: "Do not modify excluded files. Revert or request a Reverse Issue.",
            actions: ["revert_file", "request_reverse_issue"],
            requiresHuman: true,
        },
        invalid_path: {
            kind: "invalid_path",
            severity: "blocking",
            constraintId: "path.repo_relative",
            constraintKind: "path",
            constraintDesc: "Paths must be valid repo-relative.",
            fixHint: "Use repo-relative paths only. Do not use absolute paths.",
            actions: ["do_not_retry"],
            requiresHuman: true,
        },
        sensitive_path: {
            kind: "sensitive_path",
            severity: "review_required",
            constraintId: "repo_observation.sensitive_path",
            constraintKind: "human_review",
            constraintDesc: "Sensitive path requires extra review.",
            fixHint: "Keep changes minimal and request human review.",
            actions: ["ask_human_review"],
            requiresHuman: true,
        },
        requires_human_review: {
            kind: "requires_human_review",
            severity: "review_required",
            constraintId: "scope.review_required_files",
            constraintKind: "human_review",
            constraintDesc: "File requires manual review.",
            fixHint: "Ask for human review before merge.",
            actions: ["ask_human_review"],
            requiresHuman: true,
        },
    };
    const config = map[hint.violation_kind] ?? map.requires_human_review;
    return {
        violation_id: `v-${idx}`,
        kind: config.kind,
        severity: config.severity,
        location: { file_path: hint.path },
        constraint: {
            constraint_id: config.constraintId,
            constraint_kind: config.constraintKind,
            description: config.constraintDesc,
        },
        expected: hint.context.expected,
        actual: hint.context.actual ?? hint.context.reason,
        message: `${config.kind}: ${hint.path}${hint.context.package_name ? ` (${hint.context.package_name})` : ""}`,
        fix_hint: config.fixHint,
        allowed_agent_actions: config.actions,
        requires_human: config.requiresHuman,
    };
}
// ---------------------------------------------------------------------------
// Repair Plan
// ---------------------------------------------------------------------------
function buildRepairAction(action, filePath, reason, priority, requiresHuman, idx) {
    return {
        action_id: `r-${idx}`,
        action,
        target: filePath ? { file_path: filePath } : undefined,
        reason,
        priority,
        requires_human: requiresHuman,
    };
}
function buildRepairFromHint(hint, idx) {
    switch (hint.violation_kind) {
        case "missing_test_mapping":
            return buildRepairAction("add_test", hint.path, "Add test coverage for source file.", "medium", false, idx);
        case "undeclared_package":
            return buildRepairAction("update_manifest", hint.path, `Add ${hint.context.package_name ?? "package"} to package.json.`, "medium", false, idx);
        case "not_observed_file":
            return buildRepairAction("ask_human_review", hint.path, "File not in observations — request review.", "medium", true, idx);
        case "excluded_file":
            return buildRepairAction("revert_file", hint.path, "Revert excluded file.", "high", true, idx);
        case "invalid_path":
            return null; // No repair possible
        case "sensitive_path":
            return buildRepairAction("ask_human_review", hint.path, "Sensitive path — request review.", "medium", true, idx);
        default:
            return buildRepairAction("ask_human_review", hint.path, "Request human review.", "medium", true, idx);
    }
}
// ---------------------------------------------------------------------------
// Retry Guidance
// ---------------------------------------------------------------------------
function deriveRetryGuidance(verdict, violations) {
    if (verdict === "pass") {
        return {
            retry_allowed: false,
            retry_mode: "do_not_retry",
            max_recommended_retries: 0,
            instructions: ["No repair needed."],
        };
    }
    if (verdict === "requires_reverse_issue" || verdict === "fail") {
        const hasReverse = violations.some(v => v.severity === "reverse_issue_required");
        return {
            retry_allowed: false,
            retry_mode: hasReverse ? "requires_reverse_issue" : "do_not_retry",
            max_recommended_retries: 0,
            instructions: hasReverse
                ? ["Revert out-of-scope changes and request a Reverse Issue to expand scope."]
                : ["Cannot retry. Fix the blocking issue first."],
        };
    }
    // requires_review
    const allAgentFixable = violations.every(v => !v.requires_human);
    if (allAgentFixable) {
        return {
            retry_allowed: true,
            retry_mode: "safe_retry",
            max_recommended_retries: 2,
            instructions: ["Fix all violations using allowed_agent_actions, then re-run --verify."],
        };
    }
    return {
        retry_allowed: false,
        retry_mode: "requires_human",
        max_recommended_retries: 0,
        instructions: ["At least one violation requires human review. Escalate before retrying."],
    };
}
//# sourceMappingURL=diffFeedbackBuilder.js.map