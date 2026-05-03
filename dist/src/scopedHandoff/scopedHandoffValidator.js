/**
 * P17e: Scoped Handoff Validator
 *
 * 15-point validation for ScopedImplementationBoundaryPackage.
 * Ensures protocol integrity, coverage, and quality of exported rules.
 *
 * ref: P17
 */
import { FORBIDDEN_GENERIC_PHRASES, VALID_REVERSE_ISSUE_TYPES } from "./types.js";
// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
export function validateScopedImplementationBoundaryPackage(pkg, cursorRules) {
    const entries = [];
    // 1. Source hashes present
    if (!pkg.source.handoff_package_hash) {
        entries.push({ check_id: "source_handoff_hash", severity: "error", message: "Missing handoff_package_hash in source." });
    }
    if (!pkg.source.boundary_graph_hash) {
        entries.push({ check_id: "source_graph_hash", severity: "error", message: "Missing boundary_graph_hash in source." });
    }
    if (!pkg.source.blast_radius_report_hash) {
        entries.push({ check_id: "source_report_hash", severity: "error", message: "Missing blast_radius_report_hash in source." });
    }
    // 2. allowed_files include affected generated files (checked externally, but verify non-empty)
    if (pkg.allowed_files.length === 0 && pkg.summary.affected_files > 0) {
        entries.push({ check_id: "allowed_files_empty", severity: "error", message: "allowed_files is empty but affected_files > 0." });
    }
    // 3. Extra allowed files have origin + reason + source_nodes
    for (const f of pkg.allowed_files) {
        if (!f.origin) {
            entries.push({ check_id: "allowed_file_origin", severity: "error", message: `Allowed file ${f.path} missing origin.` });
        }
        if (!f.reason) {
            entries.push({ check_id: "allowed_file_reason", severity: "error", message: `Allowed file ${f.path} missing reason.` });
        }
        if (!f.source_nodes || f.source_nodes.length === 0) {
            entries.push({ check_id: "allowed_file_sources", severity: "error", message: `Allowed file ${f.path} missing source_nodes.` });
        }
    }
    // 4. required_tests include affected tests (checked via count)
    if (pkg.required_tests.length === 0 && pkg.summary.affected_tests > 0) {
        entries.push({ check_id: "required_tests_empty", severity: "error", message: "required_tests is empty but affected_tests > 0." });
    }
    // 5. required_tests have requirement value
    for (const t of pkg.required_tests) {
        if (!t.requirement) {
            entries.push({ check_id: "test_requirement", severity: "error", message: `Required test ${t.test_id} missing requirement.` });
        }
    }
    // 6. must_preserve high constraints include source_nodes
    for (const c of pkg.must_preserve) {
        if (c.severity === "high" && (!c.source_nodes || c.source_nodes.length === 0)) {
            entries.push({ check_id: "constraint_sources", severity: "error", message: `High constraint ${c.constraint_id} missing source_nodes.` });
        }
    }
    // 7. must_preserve high constraints include enforced_by
    for (const c of pkg.must_preserve) {
        if (c.severity === "high" && (!c.enforced_by || c.enforced_by.length === 0)) {
            entries.push({
                check_id: "constraint_enforcement",
                severity: "warning",
                message: `High constraint ${c.constraint_id} has no enforced_by entries.`,
                details: "Consider adding enforcement references in P18.",
            });
        }
    }
    // 8. Heuristic enforcement warning
    for (const c of pkg.must_preserve) {
        for (const e of c.enforced_by) {
            if (e.enforcement_source === "heuristic_downstream_match") {
                entries.push({
                    check_id: "heuristic_enforcement",
                    severity: "info",
                    message: `Enforcement for ${c.constraint_id} is heuristic-derived (${e.id}).`,
                    details: "enforced_by populated by heuristic downstream analysis, not explicit enforcement edges.",
                });
            }
        }
    }
    // 9. forbidden_files includes .pantheon/**
    const hasPantheonForbidden = pkg.forbidden_files.some(f => f.pattern === ".pantheon/**");
    if (!hasPantheonForbidden) {
        entries.push({ check_id: "forbidden_pantheon", severity: "error", message: "forbidden_files must include .pantheon/**." });
    }
    // 10. forbidden_files includes .cursor/**
    const hasCursorForbidden = pkg.forbidden_files.some(f => f.pattern === ".cursor/**");
    if (!hasCursorForbidden) {
        entries.push({ check_id: "forbidden_cursor", severity: "error", message: "forbidden_files must include .cursor/**." });
    }
    // 11. reverse_issue_required_if non-empty
    if (pkg.reverse_issue_required_if.length === 0) {
        entries.push({ check_id: "reverse_issues_empty", severity: "error", message: "reverse_issue_required_if must not be empty." });
    }
    // 16. reverse issue example commands use valid --type values
    for (const ri of pkg.reverse_issue_required_if) {
        const typeMatch = ri.example_command.match(/--type\s+"([^"]+)"/);
        if (typeMatch) {
            const typeValue = typeMatch[1];
            if (!isValidReverseIssueType(typeValue)) {
                entries.push({
                    check_id: "reverse_issue_invalid_type",
                    severity: "error",
                    message: `Reverse issue trigger "${ri.trigger_id}" uses invalid --type "${typeValue}". Valid: ${VALID_REVERSE_ISSUE_TYPES.join(", ")}.`,
                });
            }
        }
    }
    // 12. high risk → must_require_human_review = true
    if (pkg.summary.risk_level === "high" && !pkg.summary.must_require_human_review) {
        entries.push({ check_id: "human_review_high", severity: "error", message: "HIGH risk scope must set must_require_human_review = true." });
    }
    // 13. implementation_context includes risk level
    if (!pkg.implementation_context.toLowerCase().includes(pkg.summary.risk_level)) {
        entries.push({ check_id: "context_risk", severity: "warning", message: "implementation_context should mention the risk level." });
    }
    // 14. implementation_context includes required tests
    if (pkg.required_tests.length > 0) {
        const hasTestRef = pkg.required_tests.some(t => pkg.implementation_context.includes(t.test_id));
        if (!hasTestRef) {
            entries.push({ check_id: "context_tests", severity: "warning", message: "implementation_context should reference at least one required test." });
        }
    }
    // 15. cursor rules contain no forbidden generic phrases
    if (cursorRules) {
        const lower = cursorRules.toLowerCase();
        for (const phrase of FORBIDDEN_GENERIC_PHRASES) {
            if (lower.includes(phrase)) {
                entries.push({ check_id: "cursor_generic_phrase", severity: "error", message: `Cursor rules contain forbidden generic phrase: "${phrase}".` });
            }
        }
    }
    const errorCount = entries.filter(e => e.severity === "error").length;
    const warningCount = entries.filter(e => e.severity === "warning").length;
    let status;
    if (errorCount > 0)
        status = "fail";
    else if (warningCount > 0)
        status = "pass_with_warnings";
    else
        status = "pass";
    return { status, entries, error_count: errorCount, warning_count: warningCount };
}
// ---------------------------------------------------------------------------
// Report builder
// ---------------------------------------------------------------------------
export function buildScopedHandoffReport(pkg, validation, outputs) {
    let status;
    if (validation.status === "fail")
        status = "invalid";
    else if (validation.status === "pass_with_warnings")
        status = "ready_with_warnings";
    else
        status = "ready";
    return {
        scope_id: pkg.scope_id,
        created_at: pkg.created_at,
        status,
        validation,
        outputs,
        summary: {
            risk_level: pkg.summary.risk_level,
            must_require_human_review: pkg.summary.must_require_human_review,
            allowed_files: pkg.allowed_files.length,
            forbidden_patterns: pkg.forbidden_files.length,
            required_tests: pkg.required_tests.length,
            must_preserve: pkg.must_preserve.length,
            reverse_issue_triggers: pkg.reverse_issue_required_if.length,
        },
    };
}
// ---------------------------------------------------------------------------
// Report markdown renderer
// ---------------------------------------------------------------------------
export function renderScopedHandoffReportMarkdown(report) {
    const lines = [];
    const statusIcon = report.status === "ready" ? "✅" : report.status === "ready_with_warnings" ? "⚠️" : "❌";
    lines.push("# Scoped Handoff Report");
    lines.push("");
    lines.push(`**Status**: ${statusIcon} ${report.status}`);
    lines.push(`**Scope**: \`${report.scope_id}\``);
    lines.push(`**Risk Level**: ${report.summary.risk_level.toUpperCase()}`);
    lines.push(`**Human Review Required**: ${report.summary.must_require_human_review ? "yes" : "no"}`);
    lines.push("");
    lines.push("## Summary");
    lines.push("");
    lines.push(`| Metric | Count |`);
    lines.push(`|---|---|`);
    lines.push(`| Allowed files | ${report.summary.allowed_files} |`);
    lines.push(`| Forbidden patterns | ${report.summary.forbidden_patterns} |`);
    lines.push(`| Required tests | ${report.summary.required_tests} |`);
    lines.push(`| Must-preserve constraints | ${report.summary.must_preserve} |`);
    lines.push(`| Reverse issue triggers | ${report.summary.reverse_issue_triggers} |`);
    lines.push("");
    if (report.validation.entries.length > 0) {
        lines.push("## Validation Details");
        lines.push("");
        for (const entry of report.validation.entries) {
            const icon = entry.severity === "error" ? "❌" : entry.severity === "warning" ? "⚠️" : "ℹ️";
            lines.push(`${icon} **${entry.check_id}**: ${entry.message}`);
            if (entry.details)
                lines.push(`  - ${entry.details}`);
        }
        lines.push("");
    }
    lines.push("## Outputs");
    lines.push("");
    for (const o of report.outputs) {
        lines.push(`- \`${o}\``);
    }
    return lines.join("\n");
}
function isValidReverseIssueType(value) {
    return VALID_REVERSE_ISSUE_TYPES.some(type => type === value);
}
//# sourceMappingURL=scopedHandoffValidator.js.map