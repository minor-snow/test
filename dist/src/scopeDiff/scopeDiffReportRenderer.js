/**
 * P18: Scope Diff Report Renderer
 *
 * Renders ScopeDiffReport as human-readable Markdown.
 *
 * ref: P18
 */
const STATUS_ICONS = {
    pass: "✅",
    fail: "❌",
    requires_reverse_issue: "⚠️",
    requires_human_review: "🔒",
};
export function renderScopeDiffReportMarkdown(report) {
    const lines = [];
    const icon = STATUS_ICONS[report.status] || "❓";
    lines.push("# Scope Diff Validation Report");
    lines.push("");
    lines.push(`**Generated**: ${report.generated_at}`);
    lines.push(`**Scope**: \`${report.scope_id}\``);
    lines.push("");
    // Status
    lines.push("## Status");
    lines.push("");
    lines.push(`${icon} **${report.status.toUpperCase()}**`);
    lines.push("");
    // Blocking reasons
    if (report.blocking_reasons.length > 0) {
        lines.push("## Blocking Reasons");
        lines.push("");
        for (const reason of report.blocking_reasons) {
            lines.push(`- ${reason}`);
        }
        lines.push("");
    }
    // Summary
    lines.push("## Summary");
    lines.push("");
    lines.push("| Metric | Count |");
    lines.push("|---|---|");
    lines.push(`| Changed files | ${report.summary.changed_files} |`);
    lines.push(`| Allowed files modified | ${report.summary.allowed_files_modified} |`);
    lines.push(`| Outside scope | ${report.summary.outside_scope_files} |`);
    lines.push(`| Forbidden files | ${report.summary.forbidden_files_modified} |`);
    lines.push(`| Protocol files | ${report.summary.protocol_files_modified} |`);
    lines.push(`| Generated boundary files | ${report.summary.generated_boundary_files_modified} |`);
    lines.push(`| Required tests | ${report.summary.required_tests} |`);
    lines.push(`| Tests passed | ${report.summary.required_tests_passed} |`);
    lines.push(`| Tests failed | ${report.summary.required_tests_failed} |`);
    lines.push(`| Tests missing | ${report.summary.required_tests_missing} |`);
    lines.push(`| Reverse issue triggers | ${report.summary.reverse_issue_triggers} |`);
    lines.push("");
    // Violations
    if (report.violations.length > 0) {
        lines.push("## Violations");
        lines.push("");
        for (const v of report.violations) {
            const sevIcon = v.severity === "high" ? "🔴" : v.severity === "medium" ? "🟡" : "🔵";
            lines.push(`### ${sevIcon} ${v.violation_type}`);
            lines.push("");
            lines.push(`- **ID**: \`${v.violation_id}\``);
            lines.push(`- **Severity**: ${v.severity}`);
            if (v.file_path)
                lines.push(`- **File**: \`${v.file_path}\``);
            if (v.test_id)
                lines.push(`- **Test**: \`${v.test_id}\``);
            lines.push(`- **Message**: ${v.message}`);
            lines.push(`- **Required action**: ${v.required_action}`);
            lines.push("");
        }
    }
    // Warnings
    if (report.warnings.length > 0) {
        lines.push("## Warnings");
        lines.push("");
        for (const w of report.warnings) {
            lines.push(`- **${w.warning_type}**: ${w.message}`);
        }
        lines.push("");
    }
    // Required actions
    if (report.required_actions.length > 0) {
        lines.push("## Required Actions");
        lines.push("");
        for (let i = 0; i < report.required_actions.length; i++) {
            lines.push(`${i + 1}. ${report.required_actions[i]}`);
        }
        lines.push("");
    }
    // Source
    lines.push("## Source");
    lines.push("");
    lines.push(`- Scope hash: \`${report.source.scope_hash}\``);
    lines.push(`- Required tests hash: \`${report.source.required_tests_hash}\``);
    return lines.join("\n");
}
//# sourceMappingURL=scopeDiffReportRenderer.js.map