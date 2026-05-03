/**
 * P17b: Cursor Rules Renderer
 *
 * Renders .cursor/rules/pantheon-boundaries.md from a ScopedImplementationBoundaryPackage.
 * Every rule references concrete files, tests, constraints, or triggers.
 * Generic advice phrases are forbidden.
 *
 * ref: P17
 */
/**
 * Render Cursor adapter rules markdown from a scoped package.
 * The output is consumed by .cursor/rules/ directory.
 */
export function renderCursorRules(pkg) {
    const lines = [];
    // Header
    lines.push("# Pantheon Boundaries");
    lines.push("");
    lines.push("This task is scoped by Pantheon.");
    lines.push("");
    // Human review
    lines.push("## Human Review");
    lines.push("");
    if (pkg.summary.must_require_human_review) {
        lines.push("- Required: **yes**");
        lines.push(`- Reason: ${pkg.summary.risk_level.toUpperCase()} risk blast radius`);
    }
    else {
        lines.push("- Required: no");
    }
    lines.push("");
    // Scope summary
    lines.push("## Scope Summary");
    lines.push("");
    lines.push(`- Risk level: **${pkg.summary.risk_level.toUpperCase()}**`);
    lines.push("- Changed nodes:");
    for (const node of pkg.request.changed_nodes) {
        lines.push(`  - \`${node}\``);
    }
    lines.push(`- Affected files: ${pkg.summary.affected_files}`);
    lines.push(`- Affected symbols: ${pkg.summary.affected_symbols}`);
    lines.push(`- Required tests: ${pkg.summary.affected_tests}`);
    lines.push("");
    // Allowed files
    lines.push("## Allowed Files");
    lines.push("");
    lines.push("You may read and modify only these files unless the user explicitly approves a Pantheon reverse issue:");
    lines.push("");
    for (const f of pkg.allowed_files) {
        const ops = f.allowed_operations.join(", ");
        lines.push(`- \`${f.path}\` (${ops})`);
    }
    lines.push("");
    // Forbidden files
    lines.push("## Forbidden Files");
    lines.push("");
    lines.push("Do not modify:");
    lines.push("");
    for (const f of pkg.forbidden_files) {
        lines.push(`- \`${f.pattern}\``);
    }
    lines.push("");
    // Required tests
    if (pkg.required_tests.length > 0) {
        lines.push("## Required Tests");
        lines.push("");
        lines.push("Before completion, run or preserve:");
        lines.push("");
        for (const t of pkg.required_tests) {
            const req = t.requirement === "must_run" ? "must run" : "update if behavior changes";
            lines.push(`- \`${t.test_id}\` — ${req}`);
            if (t.file_path) {
                lines.push(`  - File: \`${t.file_path}\``);
            }
        }
        lines.push("");
    }
    // Must preserve constraints
    if (pkg.must_preserve.length > 0) {
        lines.push("## Must Preserve Constraints");
        lines.push("");
        for (const c of pkg.must_preserve) {
            lines.push(`- ${c.statement}`);
            if (c.source_nodes.length > 0) {
                lines.push(`  - Source: ${c.source_nodes.map(s => `\`${s}\``).join(", ")}`);
            }
            if (c.enforced_by.length > 0) {
                const enforcers = c.enforced_by
                    .map(e => e.file_path ? `\`${e.file_path}\`` : `\`${e.id}\``)
                    .join(", ");
                lines.push(`  - Enforced by: ${enforcers}`);
            }
        }
        lines.push("");
    }
    // Forbidden assumptions
    if (pkg.forbidden_assumptions.length > 0) {
        lines.push("## Forbidden Assumptions");
        lines.push("");
        lines.push("These assumptions are explicitly forbidden:");
        lines.push("");
        for (const fa of pkg.forbidden_assumptions) {
            lines.push(`- **${fa.statement}**`);
            if (fa.enforced_by.length > 0) {
                const enforcers = fa.enforced_by
                    .map(e => e.file_path ? `\`${e.file_path}\`` : `\`${e.id}\``)
                    .join(", ");
                lines.push(`  - Enforced by: ${enforcers}`);
            }
        }
        lines.push("");
    }
    // Reverse issue
    if (pkg.reverse_issue_required_if.length > 0) {
        lines.push("## Reverse Issue Required If");
        lines.push("");
        lines.push("Stop and create a Pantheon reverse issue if:");
        lines.push("");
        for (const ri of pkg.reverse_issue_required_if) {
            lines.push(`- ${ri.condition}`);
        }
        lines.push("");
        lines.push("Use: `npx tsx scripts/createImplementationIssue.ts` to create a structured reverse issue.");
        lines.push("");
    }
    return lines.join("\n");
}
//# sourceMappingURL=cursorRulesRenderer.js.map