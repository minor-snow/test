/**
 * P18: Reverse Issue Detector
 *
 * Detects whether any violations warrant a Pantheon Reverse Issue.
 * Aggregates into a single reverse_issue_required violation.
 *
 * ref: P18
 */
export function detectReverseIssueTriggers(input) {
    const { fileClassifications, fileViolations, testViolations, humanReviewViolations, scope } = input;
    const triggers = [];
    // Outside allowed files
    const outsideFiles = fileClassifications.filter(f => !f.is_allowed && !f.is_forbidden && !f.is_protocol_file);
    if (outsideFiles.length > 0) {
        triggers.push(`${outsideFiles.length} file(s) outside allowed scope.`);
    }
    // Forbidden files
    const forbiddenFiles = fileClassifications.filter(f => f.is_forbidden && !f.is_protocol_file);
    if (forbiddenFiles.length > 0) {
        triggers.push(`${forbiddenFiles.length} forbidden file(s) modified.`);
    }
    // Protocol files
    const protocolFiles = fileClassifications.filter(f => f.is_protocol_file);
    if (protocolFiles.length > 0) {
        triggers.push(`${protocolFiles.length} protocol file(s) modified.`);
    }
    // Generated boundary modified without modify permission
    const genBoundaryViolations = fileViolations.filter(v => v.violation_type === "generated_boundary_modified");
    if (genBoundaryViolations.length > 0) {
        triggers.push(`${genBoundaryViolations.length} generated boundary file(s) modified without modify permission.`);
    }
    // Test failures
    const testFails = testViolations.filter(v => v.violation_type === "required_test_failed");
    if (testFails.length > 0) {
        triggers.push(`${testFails.length} required test(s) failed.`);
    }
    // Human review missing
    if (humanReviewViolations.length > 0) {
        triggers.push("Human review missing on high-risk scope.");
    }
    if (triggers.length === 0) {
        return [];
    }
    // Determine severity
    const isHighSeverity = protocolFiles.length > 0 || humanReviewViolations.length > 0;
    return [{
            violation_id: "v_reverse_issue_required",
            violation_type: "reverse_issue_required",
            severity: isHighSeverity ? "high" : "medium",
            message: "One or more changes require a Pantheon Reverse Issue or approved scope expansion.",
            required_action: "Create a Pantheon Reverse Issue or expand scope through approved Pantheon workflow.",
            source: { scope_id: scope.scope_id },
        }];
}
//# sourceMappingURL=reverseIssueDetector.js.map