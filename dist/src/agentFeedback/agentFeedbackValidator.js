/**
 * P22: Agent Feedback Validator
 *
 * Validates structural correctness of AgentFeedback.
 */
export function validateAgentFeedback(feedback) {
    const errors = [];
    const warnings = [];
    // Schema
    if (feedback.schema_version !== "agent_feedback.v1") {
        errors.push(`Invalid schema_version: ${feedback.schema_version}`);
    }
    if (!feedback.feedback_id)
        errors.push("Missing feedback_id.");
    if (!feedback.generated_at)
        errors.push("Missing generated_at.");
    // Source
    const validPhases = ["diff_verification", "change_contract_lite", "repo_observation"];
    if (!validPhases.includes(feedback.source.phase)) {
        errors.push(`Invalid source.phase: ${feedback.source.phase}`);
    }
    // Verdict
    const validVerdicts = ["pass", "requires_review", "requires_reverse_issue", "fail"];
    if (!validVerdicts.includes(feedback.verdict)) {
        errors.push(`Invalid verdict: ${feedback.verdict}`);
    }
    // Summary counts
    const actualViolationCount = feedback.violations.length;
    if (feedback.summary.violation_count !== actualViolationCount) {
        errors.push(`summary.violation_count (${feedback.summary.violation_count}) does not match violations.length (${actualViolationCount}).`);
    }
    const actualBlocking = feedback.violations.filter(v => v.severity === "blocking").length;
    if (feedback.summary.blocking_count !== actualBlocking) {
        errors.push(`summary.blocking_count mismatch: expected ${actualBlocking}, got ${feedback.summary.blocking_count}.`);
    }
    const actualReview = feedback.violations.filter(v => v.severity === "review_required").length;
    if (feedback.summary.review_required_count !== actualReview) {
        errors.push(`summary.review_required_count mismatch: expected ${actualReview}, got ${feedback.summary.review_required_count}.`);
    }
    const actualReverse = feedback.violations.filter(v => v.severity === "reverse_issue_required").length;
    if (feedback.summary.reverse_issue_required_count !== actualReverse) {
        errors.push(`summary.reverse_issue_required_count mismatch: expected ${actualReverse}, got ${feedback.summary.reverse_issue_required_count}.`);
    }
    const actualHuman = feedback.violations.filter(v => v.requires_human).length;
    if (feedback.summary.requires_human_count !== actualHuman) {
        errors.push(`summary.requires_human_count mismatch: expected ${actualHuman}, got ${feedback.summary.requires_human_count}.`);
    }
    // Violations
    for (let i = 0; i < feedback.violations.length; i++) {
        const v = feedback.violations[i];
        const prefix = `violations[${i}]`;
        if (!v.kind)
            errors.push(`${prefix}: missing kind.`);
        if (!v.severity)
            errors.push(`${prefix}: missing severity.`);
        if (!v.constraint?.constraint_id)
            errors.push(`${prefix}: missing constraint.constraint_id.`);
        if (!v.message)
            errors.push(`${prefix}: missing message.`);
        if (!v.fix_hint)
            errors.push(`${prefix}: missing fix_hint.`);
        if (!v.allowed_agent_actions || v.allowed_agent_actions.length === 0) {
            errors.push(`${prefix}: empty allowed_agent_actions.`);
        }
        if (typeof v.requires_human !== "boolean") {
            errors.push(`${prefix}: requires_human must be boolean.`);
        }
        // Reverse issue severity must have valid action
        if (v.severity === "reverse_issue_required") {
            const hasAction = v.allowed_agent_actions.some(a => a === "request_reverse_issue" || a === "revert_file");
            if (!hasAction) {
                errors.push(`${prefix}: reverse_issue_required severity must include request_reverse_issue or revert_file action.`);
            }
        }
        // Stack trace check
        if (v.message.includes("at ") && v.message.includes(".ts:")) {
            warnings.push(`${prefix}: message may contain stack trace.`);
        }
        if (v.fix_hint.includes("at ") && v.fix_hint.includes(".ts:")) {
            warnings.push(`${prefix}: fix_hint may contain stack trace.`);
        }
    }
    // Blocking + retry
    const hasBlocking = feedback.violations.some(v => v.severity === "blocking");
    if (hasBlocking && feedback.retry_guidance.retry_allowed) {
        errors.push("Blocking violation present but retry_allowed is true.");
    }
    // Repair plan
    for (let i = 0; i < feedback.repair_plan.length; i++) {
        const r = feedback.repair_plan[i];
        if (!r.reason)
            errors.push(`repair_plan[${i}]: missing reason.`);
        if (typeof r.requires_human !== "boolean") {
            errors.push(`repair_plan[${i}]: requires_human must be boolean.`);
        }
    }
    // Retry guidance
    if (!feedback.retry_guidance) {
        errors.push("Missing retry_guidance.");
    }
    return {
        status: errors.length === 0 ? "valid" : "invalid",
        errors,
        warnings,
    };
}
//# sourceMappingURL=agentFeedbackValidator.js.map