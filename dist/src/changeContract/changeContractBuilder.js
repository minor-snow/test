/**
 * P19b: Change Contract Builder
 *
 * Constructs a ChangeContract from upstream Pantheon pipeline outputs:
 *   - P15 BlastRadiusReport → impact + partial refs
 *   - P17 ScopedImplementationBoundaryPackage → scope + remaining refs
 *   - ChangeIntent → human-authored intent
 *   - ChangeContractRefs.canonical_revisions → caller-provided
 *
 * The builder produces a contract in "draft" status with a deterministic
 * contract_id and a contract_created event already appended.
 *
 * Design invariants:
 *   - No full artifact copies. Only hashes, IDs, and summaries.
 *   - Obligations are derived from scope (scope_diff always required;
 *     human_review required iff scope.must_require_human_review).
 *   - contract_id is deterministic from intent + canonical refs.
 *   - The builder never changes lifecycle status beyond "draft".
 *   - P15/P17 upstream consistency is verified (graph_hash + blast_radius_hash).
 *     Mismatch throws — fail-closed.
 *
 * ref: P19b
 */
import { createHash } from "node:crypto";
import { generateContractId, createResultEvent } from "./lifecycle.js";
import { validateChangeContract } from "./changeContractValidator.js";
// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------
/**
 * Build a ChangeContract from P15/P17 outputs and an intent.
 *
 * The result is always a valid "draft" contract with:
 * - Deterministic contract_id
 * - Impact derived from P15
 * - Scope derived from P17
 * - Verification obligations auto-generated
 * - One "contract_created" event
 */
export function buildChangeContract(input) {
    const diagnostics = [];
    const now = input.timestamp ?? new Date().toISOString();
    // --- Upstream consistency binding ---
    verifyUpstreamConsistency(input);
    // --- Contract ID ---
    const contractId = generateContractId(input.intent, input.canonical_revisions);
    // --- Refs (hash-linked — must be built before impact/scope for cross-check) ---
    const refs = buildRefs(input);
    // --- Impact (from P15, with P17 risk override if mismatched) ---
    const impact = extractImpact(input.blastRadiusReport, input.scopedPackage, diagnostics);
    // --- Scope (from P17) ---
    const scope = extractScope(input.scopedPackage);
    // --- Verification Obligations ---
    const obligations = buildObligations(scope, refs);
    // --- Agent ---
    const adapter = input.adapter ?? "manual";
    // --- P15 warnings ---
    if (input.blastRadiusReport.warnings.length > 0) {
        diagnostics.push(`P15 blast radius has ${input.blastRadiusReport.warnings.length} warning(s): ` +
            input.blastRadiusReport.warnings.join("; "));
    }
    // --- Build contract_created event ---
    const createdEvent = createResultEvent("contract_created", "ok", `Contract ${contractId} created from P15+P17`, { blast_radius_hash: refs.blast_radius_hash }, now);
    const contract = {
        contract_id: contractId,
        created_at: now,
        updated_at: now,
        lifecycle_status: "draft",
        change: input.intent,
        refs,
        impact,
        scope,
        agent: {
            adapter,
            exported: false,
            constraints_summary: buildConstraintsSummary(scope),
        },
        verification: { obligations },
        result_events: [createdEvent],
        current_decision: {
            decision: "pending",
            required_actions: scope.must_require_human_review
                ? ["human_review_required"]
                : [],
        },
    };
    // --- P19.1: Validate before return ---
    const validation = validateChangeContract(contract);
    if (validation.status === "invalid") {
        throw new Error(`buildChangeContract produced an invalid contract: ` +
            validation.errors.join("; "));
    }
    diagnostics.push(...validation.warnings);
    return { contract, diagnostics };
}
// ---------------------------------------------------------------------------
// Upstream Consistency Verification
// ---------------------------------------------------------------------------
/**
 * Verify that P15 and P17 actually come from the same upstream run.
 *
 * Checks:
 *   1. P17.source.boundary_graph_hash === P15.graph_hash
 *   2. P17.source.blast_radius_report_hash matches recomputed P15 hash
 *
 * Throws on mismatch — fail-closed. A ChangeContract built from
 * unrelated P15/P17 outputs is not a valid transaction record.
 */
function verifyUpstreamConsistency(input) {
    // Check 1: boundary graph hash
    if (input.scopedPackage.source.boundary_graph_hash !== input.blastRadiusReport.graph_hash) {
        throw new Error(`P15/P17 upstream mismatch: boundary_graph_hash differs. ` +
            `P15: '${input.blastRadiusReport.graph_hash}', ` +
            `P17: '${input.scopedPackage.source.boundary_graph_hash}'. ` +
            `Cannot build a ChangeContract from unrelated pipeline outputs.`);
    }
    // Check 2: blast radius report hash
    const recomputedBlastHash = hashString(JSON.stringify(input.blastRadiusReport));
    if (input.scopedPackage.source.blast_radius_report_hash !== recomputedBlastHash) {
        throw new Error(`P15/P17 upstream mismatch: blast_radius_report_hash differs. ` +
            `P17 recorded: '${input.scopedPackage.source.blast_radius_report_hash}', ` +
            `recomputed from supplied P15: '${recomputedBlastHash}'. ` +
            `Cannot build a ChangeContract from unrelated pipeline outputs.`);
    }
}
// ---------------------------------------------------------------------------
// Impact Extraction (P15 → ChangeImpact)
// ---------------------------------------------------------------------------
/**
 * Extract impact from P15.
 *
 * If P15 and P17 disagree on risk_level, P17 wins (it has more context)
 * and a diagnostic is emitted.
 */
function extractImpact(report, scopedPkg, diagnostics) {
    let riskLevel = report.summary.highest_risk_level;
    if (report.summary.highest_risk_level !== scopedPkg.summary.risk_level) {
        diagnostics.push(`Risk level mismatch: P15 reports '${report.summary.highest_risk_level}', ` +
            `P17 reports '${scopedPkg.summary.risk_level}'. ` +
            `Using P17 value in impact.risk_level.`);
        riskLevel = scopedPkg.summary.risk_level;
    }
    return {
        changed_nodes: report.request.changed_nodes,
        risk_level: riskLevel,
        impacted_files: report.by_layer.generated_files,
        impacted_symbols: report.by_layer.generated_symbols,
        impacted_tests: report.by_layer.tests,
        impact_summary: `${report.summary.valid_changed_nodes} node(s) changed, ` +
            `${report.summary.total_downstream} downstream, ` +
            `${report.summary.affected_files} files, ` +
            `risk: ${riskLevel}`,
    };
}
// ---------------------------------------------------------------------------
// Scope Extraction (P17 → ChangeScope)
// ---------------------------------------------------------------------------
function extractScope(pkg) {
    // Hash the full enforcement surface of the scope package.
    // This covers: paths + per-file ops, constraints, assumptions (id + text),
    // required tests (id + requirement), escalation rules, and review flag.
    const scopeHash = createHash("sha256")
        .update(JSON.stringify({
        scope_id: pkg.scope_id,
        allowed_files: pkg.allowed_files.map(f => ({ path: f.path, ops: f.allowed_operations.sort() })),
        forbidden_files: pkg.forbidden_files.map(f => f.pattern).sort(),
        must_preserve: pkg.must_preserve.map(c => c.constraint_id).sort(),
        forbidden_assumptions: pkg.forbidden_assumptions
            .map(fa => ({ id: fa.assumption_id, statement: fa.statement }))
            .sort((a, b) => a.id.localeCompare(b.id)),
        required_tests: pkg.required_tests
            .map(t => ({ id: t.test_id, requirement: t.requirement }))
            .sort((a, b) => a.id.localeCompare(b.id)),
        reverse_issue_triggers: pkg.reverse_issue_required_if
            .map(ri => ({ id: ri.trigger_id, condition: ri.condition, action: ri.required_action }))
            .sort((a, b) => a.id.localeCompare(b.id)),
        must_require_human_review: pkg.summary.must_require_human_review,
    }))
        .digest("hex")
        .slice(0, 16);
    return {
        scope_hash: `scope_${scopeHash}`,
        allowed_files: pkg.allowed_files.map(f => ({
            path: f.path,
            allowed_operations: [...f.allowed_operations].sort(),
        })),
        forbidden_paths: pkg.forbidden_files.map(f => f.pattern),
        required_tests: pkg.required_tests.map(t => ({
            test_id: t.test_id,
            test_name: t.test_name,
            ...(t.file_path ? { file_path: t.file_path } : {}),
            requirement: t.requirement,
        })),
        forbidden_assumptions: pkg.forbidden_assumptions.map(fa => `${fa.assumption_id}: ${fa.statement}`),
        escalation_rules: pkg.reverse_issue_required_if.map(ri => ri.condition),
        must_require_human_review: pkg.summary.must_require_human_review,
    };
}
// ---------------------------------------------------------------------------
// Refs (hash-linked)
// ---------------------------------------------------------------------------
function buildRefs(input) {
    return {
        canonical_revisions: input.canonical_revisions,
        handoff_hash: input.scopedPackage.source.handoff_package_hash,
        boundary_graph_hash: input.scopedPackage.source.boundary_graph_hash,
        blast_radius_hash: hashString(JSON.stringify(input.blastRadiusReport)),
        scoped_handoff_hash: hashString(JSON.stringify(input.scopedPackage)),
    };
}
function hashString(s) {
    return "sha256:" + createHash("sha256").update(s).digest("hex");
}
// ---------------------------------------------------------------------------
// Verification Obligations
// ---------------------------------------------------------------------------
function buildObligations(scope, refs) {
    const obligations = [];
    // Scope diff is always required.
    obligations.push({
        obligation_id: `obl_scope_diff_${refs.scoped_handoff_hash.slice(7, 19)}`,
        type: "scope_diff",
        required: true,
        status: "pending",
        description: "P18 scope diff verification must pass before close.",
    });
    // Human review is required if scope says so.
    if (scope.must_require_human_review) {
        obligations.push({
            obligation_id: `obl_human_review_${refs.scoped_handoff_hash.slice(7, 19)}`,
            type: "human_review",
            required: true,
            status: "pending",
            description: "High-risk scope requires human review before close.",
        });
    }
    return obligations;
}
// ---------------------------------------------------------------------------
// Constraints Summary
// ---------------------------------------------------------------------------
function buildConstraintsSummary(scope) {
    const summary = [];
    if (scope.allowed_files.length > 0) {
        summary.push(`Allowed: ${scope.allowed_files.length} file(s)`);
    }
    if (scope.forbidden_paths.length > 0) {
        summary.push(`Forbidden: ${scope.forbidden_paths.length} pattern(s)`);
    }
    if (scope.forbidden_assumptions.length > 0) {
        summary.push(`${scope.forbidden_assumptions.length} forbidden assumption(s)`);
    }
    if (scope.escalation_rules.length > 0) {
        summary.push(`${scope.escalation_rules.length} escalation rule(s)`);
    }
    if (scope.must_require_human_review) {
        summary.push("Requires human review");
    }
    return summary;
}
//# sourceMappingURL=changeContractBuilder.js.map