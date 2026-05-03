/**
 * P30: Architecture Contract Renderer
 *
 * Renders `architecture_contract.md` — the human-readable summary
 * of the active architecture contract.
 *
 * ref: P30
 */
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
/**
 * Render an architecture contract as human-readable markdown.
 */
export function renderArchitectureContract(contract) {
    const lines = [];
    lines.push("# Architecture Contract");
    lines.push("");
    lines.push(`Contract ID: ${contract.architecture_contract_id}`);
    lines.push(`Source: ${contract.source_arch_id}`);
    lines.push(`Revision: ${contract.revision}`);
    lines.push(`Contract Hash: ${contract.contract_hash}`);
    lines.push("");
    // Summary stats
    lines.push("## Summary");
    lines.push("");
    lines.push(`- Accepted relations: ${contract.accepted_relations.length}`);
    lines.push(`- Active constraints: ${contract.constraints.length}`);
    lines.push(`- Rejected claims: ${contract.rejected_claims.length}`);
    lines.push(`- Unresolved claims: ${contract.unresolved_claims.length}`);
    lines.push("");
    // Constraints by tier
    const globalConstraints = contract.constraints.filter(c => c.constraint_tier === "global");
    const contextualConstraints = contract.constraints.filter(c => c.constraint_tier === "contextual");
    if (globalConstraints.length > 0) {
        lines.push("## Global Constraints");
        lines.push("");
        lines.push("These constraints apply to ALL changes, regardless of target.");
        lines.push("");
        for (const c of globalConstraints) {
            renderConstraint(lines, c);
        }
    }
    if (contextualConstraints.length > 0) {
        lines.push("## Contextual Ownership Constraints");
        lines.push("");
        lines.push("These constraints apply only when the change/repair target matches the owning module.");
        lines.push("");
        for (const c of contextualConstraints) {
            renderConstraint(lines, c);
        }
    }
    // Relations
    if (contract.accepted_relations.length > 0) {
        lines.push("## Accepted Relations");
        lines.push("");
        lines.push("| Subject | Relation | Object | Paths | Confidence |");
        lines.push("|---------|----------|--------|-------|------------|");
        for (const rel of contract.accepted_relations) {
            const paths = rel.path_patterns.length > 0 ? rel.path_patterns.join(", ") : "—";
            lines.push(`| ${rel.subject} | ${rel.relation_type} | ${rel.object || "—"} | ${paths} | ${rel.confidence} |`);
        }
        lines.push("");
    }
    // Limitations
    if (contract.limitations.length > 0) {
        lines.push("## Limitations");
        lines.push("");
        for (const limitation of contract.limitations) {
            lines.push(`- ${limitation}`);
        }
        lines.push("");
    }
    return lines.join("\n");
}
// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------
function renderConstraint(lines, constraint) {
    const severity = constraint.severity === "blocking" ? "🔴" : constraint.severity === "review" ? "🟡" : "🟢";
    lines.push(`### ${severity} ${constraint.subject}`);
    lines.push(`Type: ${constraint.constraint_type} | Severity: ${constraint.severity}`);
    if (constraint.path_patterns.length > 0) {
        lines.push(`Paths: ${constraint.path_patterns.join(", ")}`);
    }
    lines.push("");
}
//# sourceMappingURL=architectureContractRenderer.js.map