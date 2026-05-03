/**
 * Structural Term Resolver — Determines whether unknown structural terms
 * are actually resolved elsewhere in the handoff package.
 *
 * ref: P11.1-001
 *
 * A term is "resolved" if it appears with sufficient provenance in any of:
 *   - contract_definitions (strong)
 *   - data_models fields (strong)
 *   - state_machines states/transitions (strong)
 *   - conflict_policy_matrix field_group/fields (strong)
 *   - implementation_tasks (weak — only for module/title terms, not field terms)
 *   - forbidden_assumptions (strong)
 *   - risk_notes (weak)
 *
 * A term is "unresolved" if it appears in none of the above.
 */
import type { ImplementationHandoffPackage } from "./types.js";
export type StructuralTermResolution = {
    term: string;
    status: "resolved" | "unresolved";
    resolved_by: "contract_definition" | "data_model_field" | "state_machine" | "conflict_policy_matrix" | "implementation_task" | "forbidden_assumption" | "risk_note" | null;
    resolution_strength: "strong" | "weak" | null;
    source_refs: {
        source_architecture_blocks: string[];
        source_interface_blocks: string[];
        source_module_blocks: string[];
    };
    reason: string;
};
export type StructuralTermClosureReport = {
    total_unknown_structural_terms: number;
    resolved_count: number;
    unresolved_count: number;
    resolved_terms: StructuralTermResolution[];
    unresolved_terms: StructuralTermResolution[];
    generated_at: string;
};
export declare function resolveStructuralTerms(unknownTerms: string[], pkg: ImplementationHandoffPackage): StructuralTermClosureReport;
