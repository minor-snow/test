/**
 * P21: Agent Scope Lite Builder
 *
 * Derives agent-facing scope from ChangeContractLite + RepoObservations.
 *
 * For full governed scoping, see:
 *   src/scopedHandoff/scopedHandoffExporter.ts (P17)
 *   src/changeContract/agentScopeExporter.ts (P19c)
 *
 * AgentScopeLite is intentionally smaller: it is a repo-bootstrap
 * projection, not a full governed handoff package.
 */
import { generateObservationRecommendations } from "../repoObservation/observationQuality.js";
import { shortStableId } from "../deterministic.js";
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export function buildAgentScopeLite(input) {
    const { contract, observations } = input;
    const scopeId = shortStableId("scope-lite", {
        contract_id: contract.contract_id,
        created_at: contract.created_at,
        repo_observations_hash: contract.refs.repo_observations_hash,
    });
    // Allowed files: observed changed files (not excluded, not invalid)
    const allowedFiles = [];
    const reviewRequiredFiles = [];
    const violationHints = [];
    for (const status of contract.observed_scope.changed_file_statuses) {
        if (status.status === "observed") {
            allowedFiles.push(status.path);
        }
        else if (status.status === "not_observed") {
            reviewRequiredFiles.push({
                path: status.path,
                reasons: ["File not observed in repo scan; manual review required."],
            });
            violationHints.push({
                path: status.path,
                violation_kind: "not_observed_file",
                context: { expected: "File should be in observations", actual: "Not found in scan" },
            });
        }
        else if (status.status === "excluded") {
            violationHints.push({
                path: status.path,
                violation_kind: "excluded_file",
                context: { reason: status.reason },
            });
        }
        else if (status.status === "path_invalid") {
            violationHints.push({
                path: status.path,
                violation_kind: "invalid_path",
                context: { reason: status.reason },
            });
        }
    }
    // Sensitive paths from structured details (not from freeform strings)
    const sensitiveDetails = contract.observed_scope.sensitive_path_details ?? [];
    for (const sp of sensitiveDetails) {
        if (allowedFiles.includes(sp.path) && !reviewRequiredFiles.some(r => r.path === sp.path)) {
            reviewRequiredFiles.push({
                path: sp.path,
                reasons: [`Sensitive path: ${sp.reason}`],
            });
        }
        violationHints.push({
            path: sp.path,
            violation_kind: "sensitive_path",
            context: { reason: sp.reason },
        });
    }
    // Unmapped src files from structured details
    const unmappedDetails = contract.observed_scope.unmapped_src_details ?? [];
    for (const um of unmappedDetails) {
        if (allowedFiles.includes(um.path) && !reviewRequiredFiles.some(r => r.path === um.path)) {
            reviewRequiredFiles.push({
                path: um.path,
                reasons: ["No test mapping found by path convention; manual verification recommended."],
            });
        }
        violationHints.push({
            path: um.path,
            violation_kind: "missing_test_mapping",
            context: { expected: "Source changes should have related tests", actual: "No test mapping found" },
        });
    }
    // Undeclared packages from structured details
    const undeclaredDetails = contract.observed_scope.undeclared_package_details ?? [];
    for (const ud of undeclaredDetails) {
        if (allowedFiles.includes(ud.file_path) && !reviewRequiredFiles.some(r => r.path === ud.file_path)) {
            reviewRequiredFiles.push({
                path: ud.file_path,
                reasons: [`Imports undeclared package: ${ud.package_name}`],
            });
        }
        violationHints.push({
            path: ud.file_path,
            violation_kind: "undeclared_package",
            context: { package_name: ud.package_name },
        });
    }
    // Forbidden patterns
    const forbiddenPatterns = [
        { pattern: ".pantheon/**", reason: "Pantheon protocol artifacts — do not modify." },
        { pattern: ".cursor/**", reason: "Cursor adapter artifacts — managed by Pantheon." },
    ];
    // Add excluded dirs from observations
    for (const excl of observations.excluded) {
        forbiddenPatterns.push({
            pattern: `${excl.path}/**`,
            reason: `Excluded by scanner: ${excl.reason}`,
        });
    }
    // Required tests
    const requiredTests = [...contract.observed_scope.related_tests];
    // Instructions
    const instructions = buildInstructions(contract, observations);
    return {
        schema_version: "agent_scope_lite.v1",
        scope_id: scopeId,
        source_contract_id: contract.contract_id,
        source_observations_hash: contract.refs.repo_observations_hash,
        intent: contract.intent,
        allowed_files: allowedFiles,
        review_required_files: reviewRequiredFiles,
        forbidden_patterns: forbiddenPatterns,
        required_tests: requiredTests,
        instructions,
        violation_hints: violationHints,
    };
}
// ---------------------------------------------------------------------------
// Renderers
// ---------------------------------------------------------------------------
export function renderAgentScopeLiteMarkdown(scope) {
    const lines = [];
    lines.push("# Pantheon Agent Scope");
    lines.push("");
    lines.push(`Scope: \`${scope.scope_id}\``);
    lines.push(`Contract: \`${scope.source_contract_id}\``);
    lines.push("");
    if (scope.intent) {
        lines.push("## Intent");
        lines.push("");
        lines.push(`> ${scope.intent}`);
        lines.push("");
    }
    // Allowed files
    lines.push("## Allowed Files");
    lines.push("");
    if (scope.allowed_files.length > 0) {
        lines.push("You may modify these files:");
        lines.push("");
        for (const f of scope.allowed_files) {
            lines.push(`- \`${f}\``);
        }
    }
    else {
        lines.push("No files are authorized for modification.");
    }
    lines.push("");
    // Review required
    if (scope.review_required_files.length > 0) {
        lines.push("## Review Required Files");
        lines.push("");
        lines.push("These files require manual review:");
        lines.push("");
        for (const f of scope.review_required_files) {
            lines.push(`- \`${f.path}\``);
            for (const r of f.reasons) {
                lines.push(`  - ${r}`);
            }
        }
        lines.push("");
    }
    // Forbidden
    lines.push("## Forbidden Files");
    lines.push("");
    lines.push("Do NOT modify files matching these patterns:");
    lines.push("");
    for (const fp of scope.forbidden_patterns) {
        lines.push(`- \`${fp.pattern}\` — ${fp.reason}`);
    }
    lines.push("");
    // Required tests
    if (scope.required_tests.length > 0) {
        lines.push("## Required Tests");
        lines.push("");
        lines.push("Run or verify these tests:");
        lines.push("");
        for (const t of scope.required_tests) {
            lines.push(`- \`${t}\``);
        }
        lines.push("");
    }
    // Instructions
    if (scope.instructions.length > 0) {
        lines.push("## Instructions");
        lines.push("");
        for (const instr of scope.instructions) {
            lines.push(`- ${instr}`);
        }
        lines.push("");
    }
    // Footer
    lines.push("---");
    lines.push("");
    lines.push("This file is auto-generated by Pantheon. Do not edit manually.");
    lines.push(`Generated from contract \`${scope.source_contract_id}\` scope \`${scope.scope_id}\`.`);
    lines.push("");
    return lines.join("\n");
}
export function renderCursorRuleFromScope(scope) {
    const lines = [];
    lines.push("# Pantheon Change Boundaries");
    lines.push("");
    lines.push("This task is scoped by Pantheon.");
    lines.push("");
    if (scope.intent) {
        lines.push(`## Intent: ${scope.intent}`);
        lines.push("");
    }
    // Allowed files
    lines.push("## Allowed Files");
    lines.push("");
    for (const f of scope.allowed_files) {
        lines.push(`- \`${f}\``);
    }
    lines.push("");
    // Forbidden
    lines.push("## Forbidden — Do NOT Modify");
    lines.push("");
    for (const fp of scope.forbidden_patterns) {
        lines.push(`- \`${fp.pattern}\``);
    }
    lines.push("");
    // Required tests
    if (scope.required_tests.length > 0) {
        lines.push("## Required Tests");
        lines.push("");
        for (const t of scope.required_tests) {
            lines.push(`- \`${t}\``);
        }
        lines.push("");
    }
    // Escalation
    lines.push("## Stop and Report If");
    lines.push("");
    lines.push("- You need to modify a file not in the Allowed Files list.");
    lines.push("- You need to modify a Forbidden file.");
    lines.push("- You discover the change requires a broader scope.");
    lines.push("");
    return lines.join("\n");
}
// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------
function buildInstructions(contract, observations) {
    const instructions = [];
    for (const action of contract.decision.required_actions) {
        instructions.push(action);
    }
    // Quality recommendations (capped)
    const recs = generateObservationRecommendations({ quality: observations.quality });
    for (const rec of recs.slice(0, 3)) {
        instructions.push(rec);
    }
    if (contract.decision.verdict === "requires_reverse_issue") {
        instructions.push("If you need to expand the change scope, create a Pantheon reverse issue before proceeding.");
    }
    return instructions;
}
//# sourceMappingURL=agentScopeLiteBuilder.js.map