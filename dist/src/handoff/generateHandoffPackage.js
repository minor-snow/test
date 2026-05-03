/**
 * Handoff Package Generator — Orchestrates all projectors
 *
 * ref: P11a-009
 *
 * Reads P10 canonical artifacts and assembles the handoff package.
 * Also generates HANDOFF.md (human-readable rendering).
 */
import { projectContractDefinitions } from "./contractProjector.js";
import { projectConflictPolicyMatrix } from "./conflictProjector.js";
import { projectDataModels } from "./dataModelProjector.js";
import { projectStateMachines } from "./stateMachineProjector.js";
import { projectForbiddenAssumptions } from "./forbiddenAssumptions.js";
import { projectImplementationTasks } from "./taskProjector.js";
function extractRiskNotes(risks) {
    return risks.map(r => ({
        risk_id: r.risk_id,
        severity: r.severity,
        description: r.why_accepted,
        mitigation: r.mitigation || "",
        source_blocks: r.block_id !== "n/a" ? [r.block_id] : [],
    }));
}
export function generateHandoffPackage(architecture, interfaceSpec, moduleSpec, risks) {
    // Run all projectors
    const contracts = projectContractDefinitions(architecture, interfaceSpec, moduleSpec);
    const conflicts = projectConflictPolicyMatrix(architecture, interfaceSpec, moduleSpec);
    const dataModels = projectDataModels(architecture, interfaceSpec, moduleSpec);
    const stateMachines = projectStateMachines(architecture, interfaceSpec, moduleSpec);
    const forbidden = projectForbiddenAssumptions(architecture, interfaceSpec, moduleSpec);
    const tasks = projectImplementationTasks(architecture, interfaceSpec, moduleSpec);
    const riskNotes = extractRiskNotes(risks);
    const sourceArtifacts = [
        { artifact_id: architecture.artifact_id, artifact_type: architecture.artifact_type, revision_id: architecture.revision_id },
        { artifact_id: interfaceSpec.artifact_id, artifact_type: interfaceSpec.artifact_type, revision_id: interfaceSpec.revision_id },
        { artifact_id: moduleSpec.artifact_id, artifact_type: moduleSpec.artifact_type, revision_id: moduleSpec.revision_id },
    ];
    const pkg = {
        package_id: `handoff_${Date.now()}`,
        project_id: "pet_triage_offline_migration",
        created_at: new Date().toISOString(),
        source_artifacts: sourceArtifacts,
        implementation_scope: {
            target_platform: "android",
            stack: ["Kotlin", "Jetpack Compose", "Room", "WorkManager", "OkHttp/Retrofit"],
            included_components: [
                "OfflineDecisionTreeRunner",
                "PendingReportRepository",
                "SyncQueueManager",
                "RetryLedger",
                "ConflictResolver",
                "ClinicReplicaClient",
                "AuditEventWriter",
                "ConnectivityObserver",
                "UserConflictReviewPresenter",
            ],
            excluded_components: [
                "Backend server implementation",
                "iOS client",
                "Web admin dashboard",
                "ML-based triage",
            ],
            non_goals: [
                "Real-time collaborative editing",
                "P2P sync between devices",
                "Full CRDT implementation",
                "Backend migration",
            ],
        },
        contract_definitions: contracts.definitions,
        conflict_policy_matrix: conflicts.matrix,
        data_models: dataModels.models,
        state_machines: stateMachines.machines,
        implementation_tasks: tasks,
        risk_notes: riskNotes,
        forbidden_assumptions: forbidden,
    };
    const renderMarkdown = (closure) => renderHandoffMarkdown(pkg, contracts, conflicts, dataModels, stateMachines, closure);
    return { pkg, contracts, conflicts, dataModels, stateMachines, renderMarkdown };
}
// ---------------------------------------------------------------------------
// Markdown renderer
// ---------------------------------------------------------------------------
function renderHandoffMarkdown(pkg, contracts, conflicts, dataModels, stateMachines, closure) {
    const lines = [];
    const ln = (s = "") => lines.push(s);
    ln("# Implementation Handoff: Pet Triage Offline-First Migration");
    ln();
    ln(`**Package ID**: \`${pkg.package_id}\``);
    ln(`**Created**: ${pkg.created_at}`);
    ln(`**Platform**: ${pkg.implementation_scope.target_platform}`);
    ln(`**Stack**: ${pkg.implementation_scope.stack.join(", ")}`);
    ln();
    ln("---");
    ln();
    // What Is Normative / Advisory / Open Gaps
    ln("## Normative vs Advisory");
    ln();
    ln("### What Is Normative (must not deviate)");
    ln("- All **contract definitions** (terms, kinds, fields, enum values)");
    ln("- All **conflict policy matrix** entries (field → policy mapping)");
    ln("- All **state machine** definitions (states, transitions, forbidden transitions)");
    ln("- All **forbidden assumptions**");
    ln("- All **data model** field definitions and invariants");
    ln();
    ln("### What Is Advisory (guidance, not law)");
    ln("- Implementation task descriptions and suggested test names");
    ln("- Risk note descriptions");
    ln("- Non-goal explanations");
    ln();
    ln("### Open Gaps");
    if (contracts.mandatory_coverage.missing.length > 0) {
        for (const t of contracts.mandatory_coverage.missing)
            ln(`- Missing mandatory term: \`${t}\``);
    }
    if (contracts.unknown_structural_terms.length > 0) {
        ln(`- ${contracts.unknown_structural_terms.length} unknown structural terms found (not in mandatory list)`);
    }
    if (stateMachines.orphan_states.length > 0) {
        for (const s of stateMachines.orphan_states)
            ln(`- Orphan state: \`${s}\``);
    }
    if (contracts.mandatory_coverage.missing.length === 0 &&
        contracts.unknown_structural_terms.length === 0 &&
        stateMachines.orphan_states.length === 0) {
        ln("- None identified");
    }
    ln();
    ln("---");
    ln();
    // Source artifacts
    ln("## 1. Source Artifacts");
    ln();
    ln("| Artifact | Type | Revision |");
    ln("|---|---|---|");
    for (const sa of pkg.source_artifacts) {
        ln(`| \`${sa.artifact_id}\` | ${sa.artifact_type} | \`${sa.revision_id}\` |`);
    }
    ln();
    ln("---");
    ln();
    // Scope
    ln("## 2. Implementation Scope");
    ln();
    ln(`**Target**: ${pkg.implementation_scope.target_platform}`);
    ln(`**Stack**: ${pkg.implementation_scope.stack.join(", ")}`);
    ln();
    ln("### Included Components");
    for (const c of pkg.implementation_scope.included_components)
        ln(`- ${c}`);
    ln();
    ln("### Excluded");
    for (const c of pkg.implementation_scope.excluded_components)
        ln(`- ${c}`);
    ln();
    ln("### Non-Goals");
    for (const g of pkg.implementation_scope.non_goals)
        ln(`- ${g}`);
    ln();
    ln("---");
    ln();
    // Contract definitions
    ln("## 3. Contract Definitions");
    ln();
    ln(`${contracts.mandatory_coverage.covered}/${contracts.mandatory_coverage.total} mandatory terms defined.`);
    ln();
    for (const d of pkg.contract_definitions) {
        ln(`### \`${d.term}\` (${d.kind})`);
        ln();
        ln(d.definition);
        ln();
        if (d.fields && d.fields.length > 0) {
            ln("| Field | Type | Required | Description |");
            ln("|---|---|---|---|");
            for (const f of d.fields) {
                ln(`| \`${f.name}\` | ${f.type} | ${f.required ? "yes" : "no"} | ${f.description} |`);
            }
            ln();
        }
        if (d.enum_values && d.enum_values.length > 0) {
            ln("| Value | Description |");
            ln("|---|---|");
            for (const v of d.enum_values) {
                ln(`| \`${v.value}\` | ${v.description} |`);
            }
            ln();
        }
    }
    ln("---");
    ln();
    // Conflict policy matrix
    ln("## 4. Conflict Policy Matrix");
    ln();
    ln("| Field Group | Policy | Risk | Audit | User Visible |");
    ln("|---|---|---|---|---|");
    for (const e of pkg.conflict_policy_matrix) {
        ln(`| ${e.field_group} | \`${e.policy}\` | ${e.risk_level} | ${e.audit_required ? "yes" : "no"} | ${e.user_visible_on_conflict ? "yes" : "no"} |`);
    }
    ln();
    ln("---");
    ln();
    // Data models
    ln("## 5. Data Models");
    ln();
    ln(`${dataModels.room_entity_count} Room entities, ${dataModels.network_dto_count} Network DTOs`);
    ln();
    for (const m of pkg.data_models) {
        ln(`### ${m.name} (${m.kind})`);
        ln();
        ln("| Field | Type | Nullable | PK | Indexed | Conflict Policy | Description |");
        ln("|---|---|---|---|---|---|---|");
        for (const f of m.fields) {
            ln(`| \`${f.name}\` | ${f.type} | ${f.nullable ? "yes" : "no"} | ${f.primary_key ? "yes" : ""} | ${f.indexed ? "yes" : ""} | ${f.conflict_policy || ""} | ${f.description} |`);
        }
        ln();
        if (m.invariants.length > 0) {
            ln("**Invariants:**");
            for (const inv of m.invariants)
                ln(`- ${inv}`);
            ln();
        }
    }
    ln("---");
    ln();
    // State machines
    ln("## 6. State Machines");
    ln();
    for (const m of pkg.state_machines) {
        ln(`### ${m.name}`);
        ln();
        ln(`**States**: ${m.states.map(s => `\`${s}\``).join(", ")}`);
        ln();
        ln("#### Allowed Transitions");
        ln();
        ln("| From | To | Trigger | Audit Required |");
        ln("|---|---|---|---|");
        for (const t of m.allowed_transitions) {
            ln(`| \`${t.from}\` | \`${t.to}\` | ${t.trigger} | ${t.audit_event_required ? "yes" : "no"} |`);
        }
        ln();
        ln("#### Forbidden Transitions");
        ln();
        ln("| From | To | Reason |");
        ln("|---|---|---|");
        for (const t of m.forbidden_transitions) {
            ln(`| \`${t.from}\` | \`${t.to}\` | ${t.reason} |`);
        }
        ln();
    }
    ln("---");
    ln();
    // Tasks
    ln("## 7. Implementation Tasks");
    ln();
    for (const t of pkg.implementation_tasks) {
        ln(`### ${t.task_id}: ${t.title}`);
        ln();
        ln(`**Module**: ${t.target_module}`);
        ln();
        ln(t.description);
        ln();
        ln("**Acceptance Criteria:**");
        for (const c of t.acceptance_criteria)
            ln(`- ${c}`);
        ln();
        ln("**Required Tests:**");
        for (const r of t.required_tests)
            ln(`- ${r}`);
        ln();
    }
    ln("---");
    ln();
    // Forbidden assumptions
    ln("## 8. Forbidden Assumptions");
    ln();
    for (const fa of pkg.forbidden_assumptions) {
        ln(`### ${fa.assumption_id}`);
        ln();
        ln(`**${fa.statement}**`);
        ln();
        ln(`Reason: ${fa.reason}`);
        ln();
    }
    ln("---");
    ln();
    // Risk notes
    ln("## 9. Risk Notes");
    ln();
    ln("| Risk | Severity | Mitigation |");
    ln("|---|---|---|");
    for (const r of pkg.risk_notes) {
        ln(`| ${r.description.slice(0, 80)}... | ${r.severity} | ${r.mitigation.slice(0, 80)}... |`);
    }
    ln();
    ln("---");
    ln();
    // Structural Term Closure (P11.1)
    ln("## 10. Structural Term Closure");
    ln();
    ln("Unknown structural terms are not automatically treated as failures.");
    ln("A term is blocking only if it remains unresolved after checking:");
    ln("- contract definitions");
    ln("- data model fields");
    ln("- state machines");
    ln("- conflict policy matrix");
    ln("- implementation tasks");
    ln();
    if (closure) {
        ln(`**Total unknown**: ${closure.total_unknown_structural_terms}`);
        ln(`**Resolved**: ${closure.resolved_count}`);
        ln(`**Unresolved**: ${closure.unresolved_count}`);
        ln();
        if (closure.resolved_terms.length > 0) {
            ln("### Resolved Terms");
            ln();
            ln("| Term | Resolved By | Reason |");
            ln("|---|---|---|");
            for (const t of closure.resolved_terms) {
                ln(`| \`${t.term}\` | ${t.resolved_by} | ${t.reason} |`);
            }
            ln();
        }
        if (closure.unresolved_terms.length > 0) {
            ln("### ⚠️ Unresolved Terms");
            ln();
            ln("| Term | Why Unresolved | Required Fix |");
            ln("|---|---|---|");
            for (const t of closure.unresolved_terms) {
                ln(`| \`${t.term}\` | ${t.reason} | Add to contract definitions or data model |`);
            }
            ln();
        }
    }
    else {
        ln("*Structural term closure report not available. Run P11.1 pipeline to generate.*");
        ln();
    }
    return lines.join("\n");
}
//# sourceMappingURL=generateHandoffPackage.js.map