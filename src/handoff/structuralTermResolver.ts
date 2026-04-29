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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StructuralTermResolution = {
  term: string;
  status: "resolved" | "unresolved";
  resolved_by:
    | "contract_definition"
    | "data_model_field"
    | "state_machine"
    | "conflict_policy_matrix"
    | "implementation_task"
    | "forbidden_assumption"
    | "risk_note"
    | null;
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

// ---------------------------------------------------------------------------
// Suffix classification
// ---------------------------------------------------------------------------

/** Terms ending with these suffixes represent fields/enums/payloads/states/policies
 *  and cannot be resolved by implementation_task alone. */
const STRONG_RESOLUTION_REQUIRED_SUFFIXES = [
  "_id", "_state", "_status", "_type", "_policy", "_payload",
  "_entity", "_dto", "_cursor", "_token",
];

function requiresStrongResolution(term: string): boolean {
  return STRONG_RESOLUTION_REQUIRED_SUFFIXES.some(s => term.endsWith(s));
}

// ---------------------------------------------------------------------------
// Resolution checkers
// ---------------------------------------------------------------------------

function tryContractDefinition(
  term: string,
  pkg: ImplementationHandoffPackage,
): StructuralTermResolution | null {
  for (const cd of pkg.contract_definitions) {
    if (cd.term === term && cd.definition) {
      const total =
        cd.source_architecture_blocks.length +
        cd.source_interface_blocks.length +
        cd.source_module_blocks.length;
      if (total > 0) {
        return {
          term,
          status: "resolved",
          resolved_by: "contract_definition",
          resolution_strength: "strong",
          source_refs: {
            source_architecture_blocks: cd.source_architecture_blocks,
            source_interface_blocks: cd.source_interface_blocks,
            source_module_blocks: cd.source_module_blocks,
          },
          reason: `Defined in contract_definitions as '${cd.kind}' with ${total} source block(s)`,
        };
      }
    }
  }
  return null;
}

function tryDataModelField(
  term: string,
  pkg: ImplementationHandoffPackage,
): StructuralTermResolution | null {
  for (const m of pkg.data_models) {
    // Check field names
    for (const f of m.fields) {
      if (f.name === term && f.type && f.description) {
        const archBlocks = m.source_architecture_blocks || [];
        const ifaceBlocks = m.source_interface_blocks || [];
        const modBlocks = m.source_module_blocks || [];
        if (archBlocks.length + ifaceBlocks.length + modBlocks.length > 0) {
          return {
            term,
            status: "resolved",
            resolved_by: "data_model_field",
            resolution_strength: "strong",
            source_refs: {
              source_architecture_blocks: archBlocks,
              source_interface_blocks: ifaceBlocks,
              source_module_blocks: modBlocks,
            },
            reason: `Field '${term}' in ${m.name} (type: ${f.type})`,
          };
        }
      }
    }
    // Check model name (snake_case)
    const modelSnake = m.name
      .replace(/([A-Z])/g, "_$1")
      .toLowerCase()
      .replace(/^_/, "");
    if (modelSnake === term || m.name.toLowerCase() === term.replace(/_/g, "")) {
      const archBlocks = m.source_architecture_blocks || [];
      const ifaceBlocks = m.source_interface_blocks || [];
      const modBlocks = m.source_module_blocks || [];
      if (archBlocks.length + ifaceBlocks.length + modBlocks.length > 0) {
        return {
          term,
          status: "resolved",
          resolved_by: "data_model_field",
          resolution_strength: "strong",
          source_refs: {
            source_architecture_blocks: archBlocks,
            source_interface_blocks: ifaceBlocks,
            source_module_blocks: modBlocks,
          },
          reason: `Matches data model '${m.name}' with source blocks`,
        };
      }
    }
  }
  return null;
}

function tryStateMachine(
  term: string,
  pkg: ImplementationHandoffPackage,
): StructuralTermResolution | null {
  for (const sm of pkg.state_machines) {
    const nameSnake = sm.name
      .replace(/([A-Z])/g, "_$1")
      .toLowerCase()
      .replace(/^_/, "");
    const inStates = sm.states.includes(term);
    const inTransitions =
      sm.allowed_transitions.some(t => t.from === term || t.to === term || t.trigger === term) ||
      sm.forbidden_transitions.some(t => t.from === term || t.to === term);
    const nameMatch = nameSnake === term;

    if (inStates || inTransitions || nameMatch) {
      const archBlocks = sm.source_architecture_blocks || [];
      const ifaceBlocks = sm.source_interface_blocks || [];
      const modBlocks = sm.source_module_blocks || [];
      if (archBlocks.length + ifaceBlocks.length + modBlocks.length > 0) {
        return {
          term,
          status: "resolved",
          resolved_by: "state_machine",
          resolution_strength: "strong",
          source_refs: {
            source_architecture_blocks: archBlocks,
            source_interface_blocks: ifaceBlocks,
            source_module_blocks: modBlocks,
          },
          reason: `Found in state machine '${sm.name}' (${inStates ? "state" : inTransitions ? "transition" : "name match"})`,
        };
      }
    }
  }
  return null;
}

function tryConflictPolicyMatrix(
  term: string,
  pkg: ImplementationHandoffPackage,
): StructuralTermResolution | null {
  for (const e of pkg.conflict_policy_matrix) {
    const inFieldGroup = e.field_group === term;
    const inFields = e.fields.includes(term);

    if ((inFieldGroup || inFields) && e.policy && e.rationale) {
      const archBlocks = e.source_architecture_blocks || [];
      const ifaceBlocks = e.source_interface_blocks || [];
      const modBlocks = e.source_module_blocks || [];
      if (archBlocks.length + ifaceBlocks.length + modBlocks.length > 0) {
        return {
          term,
          status: "resolved",
          resolved_by: "conflict_policy_matrix",
          resolution_strength: "strong",
          source_refs: {
            source_architecture_blocks: archBlocks,
            source_interface_blocks: ifaceBlocks,
            source_module_blocks: modBlocks,
          },
          reason: `Found in conflict_policy_matrix '${e.field_group}' (policy: ${e.policy})`,
        };
      }
    }
  }
  return null;
}

function tryForbiddenAssumption(
  term: string,
  pkg: ImplementationHandoffPackage,
): StructuralTermResolution | null {
  for (const fa of pkg.forbidden_assumptions) {
    const text = `${fa.statement} ${fa.reason}`.toLowerCase();
    const termSpaced = term.replace(/_/g, " ");
    const termFlat = term.replace(/_/g, "");
    if (text.includes(termSpaced) || text.includes(term) || text.includes(termFlat)) {
      if (fa.source_blocks.length > 0) {
        return {
          term,
          status: "resolved",
          resolved_by: "forbidden_assumption",
          resolution_strength: "strong",
          source_refs: {
            source_architecture_blocks: fa.source_blocks,
            source_interface_blocks: [],
            source_module_blocks: [],
          },
          reason: `Referenced in forbidden assumption '${fa.assumption_id}'`,
        };
      }
    }
  }
  return null;
}

function tryImplementationTask(
  term: string,
  pkg: ImplementationHandoffPackage,
): StructuralTermResolution | null {
  // Weak resolution: only accepted for non-field terms
  if (requiresStrongResolution(term)) return null;

  const termSpaced = term.replace(/_/g, " ");   // "clinic replica client"
  const termFlat = term.replace(/_/g, "");       // "clinicreplicaclient" — matches CamelCase

  for (const t of pkg.implementation_tasks) {
    const searchText = `${t.title} ${t.description} ${t.target_module}`.toLowerCase();
    if (
      (searchText.includes(termSpaced) || searchText.includes(term) || searchText.includes(termFlat)) &&
      t.source_blocks.length > 0
    ) {
      return {
        term,
        status: "resolved",
        resolved_by: "implementation_task",
        resolution_strength: "weak",
        source_refs: {
          source_architecture_blocks: t.source_blocks,
          source_interface_blocks: [],
          source_module_blocks: [],
        },
        reason: `Referenced in task '${t.task_id}: ${t.title}' (weak resolution — module/component term)`,
      };
    }
  }
  return null;
}

function tryRiskNote(
  term: string,
  pkg: ImplementationHandoffPackage,
): StructuralTermResolution | null {
  // Weak resolution: only for non-field terms
  if (requiresStrongResolution(term)) return null;

  for (const r of pkg.risk_notes) {
    const text = `${r.description} ${r.mitigation}`.toLowerCase();
    const termSpaced = term.replace(/_/g, " ");
    const termFlat = term.replace(/_/g, "");
    if (
      (text.includes(termSpaced) || text.includes(term) || text.includes(termFlat)) &&
      r.source_blocks.length > 0
    ) {
      return {
        term,
        status: "resolved",
        resolved_by: "risk_note",
        resolution_strength: "weak",
        source_refs: {
          source_architecture_blocks: r.source_blocks,
          source_interface_blocks: [],
          source_module_blocks: [],
        },
        reason: `Referenced in risk note '${r.risk_id}'`,
      };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function resolveStructuralTerms(
  unknownTerms: string[],
  pkg: ImplementationHandoffPackage,
): StructuralTermClosureReport {
  const resolved: StructuralTermResolution[] = [];
  const unresolved: StructuralTermResolution[] = [];

  const resolvers = [
    tryContractDefinition,
    tryDataModelField,
    tryStateMachine,
    tryConflictPolicyMatrix,
    tryForbiddenAssumption,
    tryImplementationTask,
    tryRiskNote,
  ];

  for (const term of unknownTerms) {
    let resolution: StructuralTermResolution | null = null;

    for (const resolver of resolvers) {
      resolution = resolver(term, pkg);
      if (resolution) break;
    }

    if (resolution) {
      resolved.push(resolution);
    } else {
      unresolved.push({
        term,
        status: "unresolved",
        resolved_by: null,
        resolution_strength: null,
        source_refs: {
          source_architecture_blocks: [],
          source_interface_blocks: [],
          source_module_blocks: [],
        },
        reason: `Term '${term}' not found in any handoff package section with sufficient provenance`,
      });
    }
  }

  return {
    total_unknown_structural_terms: unknownTerms.length,
    resolved_count: resolved.length,
    unresolved_count: unresolved.length,
    resolved_terms: resolved,
    unresolved_terms: unresolved,
    generated_at: new Date().toISOString(),
  };
}
