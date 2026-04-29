/**
 * Handoff Readiness Evaluator — Deterministic quality gate
 *
 * ref: P11a-008
 *
 * Checks the handoff package against 12 readiness criteria.
 * Any critical violation → not_ready (cannot downgrade to ready_with_risks).
 */

import type {
  ImplementationHandoffPackage,
  HandoffReadinessReport,
  ReadinessCheck,
  SourceArtifactRef,
  UncertaintyRegister,
} from "./types.js";
import { hasBlockingUncertainties, getBlockingUncertainties } from "./uncertaintyRegister.js";

// ---------------------------------------------------------------------------
// Check implementations
// ---------------------------------------------------------------------------

function checkSourceRevisions(
  pkg: ImplementationHandoffPackage,
  canonicalRefs: SourceArtifactRef[],
): ReadinessCheck {
  const mismatches: string[] = [];
  for (const expected of canonicalRefs) {
    const found = pkg.source_artifacts.find(s => s.artifact_id === expected.artifact_id);
    if (!found) {
      mismatches.push(`${expected.artifact_id}: missing`);
    } else if (found.revision_id !== expected.revision_id) {
      mismatches.push(`${expected.artifact_id}: expected ${expected.revision_id}, got ${found.revision_id}`);
    }
  }
  return {
    check_id: "source_revision_match",
    status: mismatches.length === 0 ? "pass" : "fail",
    message: mismatches.length === 0
      ? "All source artifact revisions match canonical pointers"
      : `Revision mismatches: ${mismatches.join("; ")}`,
  };
}

function checkContractCoverage(
  pkg: ImplementationHandoffPackage,
  mandatoryCount: number,
  missingTerms: string[],
): ReadinessCheck {
  const covered = pkg.contract_definitions.length;
  return {
    check_id: "contract_coverage",
    status: missingTerms.length === 0 ? "pass" : "fail",
    message: missingTerms.length === 0
      ? `All ${mandatoryCount} mandatory terms defined`
      : `Missing ${missingTerms.length} terms: ${missingTerms.join(", ")}`,
  };
}

function checkContractProvenance(pkg: ImplementationHandoffPackage): ReadinessCheck {
  const unprovenanced: string[] = [];
  for (const d of pkg.contract_definitions) {
    const total = d.source_architecture_blocks.length +
      d.source_interface_blocks.length +
      d.source_module_blocks.length;
    if (total === 0) unprovenanced.push(d.term);
  }
  return {
    check_id: "contract_provenance",
    status: unprovenanced.length === 0 ? "pass" : "fail",
    message: unprovenanced.length === 0
      ? "All contract definitions have source block provenance"
      : `Terms without provenance: ${unprovenanced.join(", ")}`,
  };
}

function checkConflictMatrixCoverage(
  pkg: ImplementationHandoffPackage,
  requiredFieldGroups: string[],
): ReadinessCheck {
  const covered = new Set(pkg.conflict_policy_matrix.map(e => e.field_group));
  const missing = requiredFieldGroups.filter(fg => !covered.has(fg));
  return {
    check_id: "conflict_matrix_coverage",
    status: missing.length === 0 ? "pass" : "fail",
    message: missing.length === 0
      ? `All ${requiredFieldGroups.length} required field groups covered`
      : `Missing field groups: ${missing.join(", ")}`,
  };
}

function checkClinicalLwwViolations(pkg: ImplementationHandoffPackage): ReadinessCheck {
  const violations: string[] = [];
  const clinicalGroups = [
    "patient_case_status", "vet_note_summary", "triage_report_body",
    "risk_level", "suspected_condition",
  ];
  for (const entry of pkg.conflict_policy_matrix) {
    if (clinicalGroups.includes(entry.field_group) && entry.policy === "last_writer_wins") {
      violations.push(entry.field_group);
    }
  }
  return {
    check_id: "clinical_lww_check",
    status: violations.length === 0 ? "pass" : "fail",
    message: violations.length === 0
      ? "No clinical fields use LWW"
      : `CRITICAL: Clinical fields using LWW: ${violations.join(", ")}`,
  };
}

function checkDataModelTypes(pkg: ImplementationHandoffPackage): ReadinessCheck {
  const knownTypes = new Set([
    "String", "Int", "Long", "Boolean", "Float", "Double",
    "String (UUID)", "String (ISO-8601)",
    "Map<String, Int>", "List<String>",
    "TriageResult", "ReportSnapshot", "OfflineReportEnvelope",
    "ConflictPayload", "RemoteChange", "List<RemoteChange>",
    "VectorClock",
  ]);
  const unknowns: string[] = [];
  for (const m of pkg.data_models) {
    for (const f of m.fields) {
      if (!knownTypes.has(f.type)) {
        unknowns.push(`${m.name}.${f.name}: ${f.type}`);
      }
    }
  }
  return {
    check_id: "data_model_types",
    status: unknowns.length === 0 ? "pass" : "warning",
    message: unknowns.length === 0
      ? "All field types are known"
      : `Unknown types: ${unknowns.join("; ")}`,
  };
}

function checkStateMachineOrphans(pkg: ImplementationHandoffPackage): ReadinessCheck {
  const orphans: string[] = [];
  for (const m of pkg.state_machines) {
    const referenced = new Set<string>();
    for (const t of m.allowed_transitions) {
      referenced.add(t.from);
      referenced.add(t.to);
    }
    for (const t of m.forbidden_transitions) {
      referenced.add(t.from);
      referenced.add(t.to);
    }
    for (const s of m.states) {
      if (!referenced.has(s)) orphans.push(`${m.name}.${s}`);
    }
  }
  return {
    check_id: "state_machine_orphans",
    status: orphans.length === 0 ? "pass" : "warning",
    message: orphans.length === 0
      ? "No orphan states"
      : `Orphan states: ${orphans.join(", ")}`,
  };
}

function checkStateMachineContradictions(pkg: ImplementationHandoffPackage): ReadinessCheck {
  const contradictions: string[] = [];
  for (const m of pkg.state_machines) {
    const allowedEdges = new Set(
      m.allowed_transitions.map(t => `${t.from}->${t.to}`)
    );
    for (const f of m.forbidden_transitions) {
      const edge = `${f.from}->${f.to}`;
      if (allowedEdges.has(edge)) {
        contradictions.push(`${m.name}: ${edge} is both allowed and forbidden`);
      }
    }
  }
  return {
    check_id: "state_machine_contradictions",
    status: contradictions.length === 0 ? "pass" : "fail",
    message: contradictions.length === 0
      ? "No contradictory transitions (allowed ∩ forbidden = ∅)"
      : `CRITICAL: Contradictory transitions: ${contradictions.join("; ")}`,
  };
}

function checkTaskProvenance(pkg: ImplementationHandoffPackage): ReadinessCheck {
  const unlinked: string[] = [];
  for (const t of pkg.implementation_tasks) {
    if (t.source_blocks.length === 0) unlinked.push(t.task_id);
  }
  return {
    check_id: "task_provenance",
    status: unlinked.length === 0 ? "pass" : "fail",
    message: unlinked.length === 0
      ? `All ${pkg.implementation_tasks.length} tasks have source block provenance`
      : `Tasks without source blocks: ${unlinked.join(", ")}`,
  };
}

function checkForbiddenAssumptions(pkg: ImplementationHandoffPackage): ReadinessCheck {
  const count = pkg.forbidden_assumptions.length;
  return {
    check_id: "forbidden_assumptions_exist",
    status: count >= 6 ? "pass" : "fail",
    message: count >= 6
      ? `${count} forbidden assumptions defined (>= 6)`
      : `Only ${count} forbidden assumptions (need >= 6)`,
  };
}

function checkRiskNotes(pkg: ImplementationHandoffPackage): ReadinessCheck {
  const hasHighRisk = pkg.risk_notes.some(r => r.severity === "high");
  return {
    check_id: "risk_notes_completeness",
    status: hasHighRisk ? "pass" : "warning",
    message: hasHighRisk
      ? `${pkg.risk_notes.length} risk notes including high-severity conflict strategy notes`
      : `${pkg.risk_notes.length} risk notes but no high-severity entry for conflict strategy`,
  };
}

// ---------------------------------------------------------------------------
// Required field groups (from P11 spec)
// ---------------------------------------------------------------------------

const REQUIRED_FIELD_GROUPS = [
  "patient_case_status", "vet_note_summary", "triage_report_body",
  "risk_level", "suspected_condition", "pending_report_state",
  "sync_cursor", "retry_attempt_count", "last_viewed_screen",
  "local_cache_timestamp", "clinic_replica_id", "device_id", "actor_id",
];

function checkUnresolvedStructuralTerms(unresolvedTerms: string[]): ReadinessCheck {
  if (unresolvedTerms.length > 0) {
    return {
      check_id: "unresolved_structural_terms",
      status: "fail",
      message: `Unresolved structural terms: ${unresolvedTerms.join(", ")}`,
    };
  }
  return {
    check_id: "unresolved_structural_terms",
    status: "pass",
    message: "All structural terms resolved",
  };
}

// ---------------------------------------------------------------------------
// P13-C: Uncertainty blocking gate
// ---------------------------------------------------------------------------

function checkBlockingUncertainties(register?: UncertaintyRegister): ReadinessCheck {
  if (!register) {
    return {
      check_id: "blocking_uncertainties",
      status: "pass",
      message: "No uncertainty register provided (skipped)",
    };
  }
  if (hasBlockingUncertainties(register)) {
    const blocking = getBlockingUncertainties(register);
    return {
      check_id: "blocking_uncertainties",
      status: "fail",
      message: `${blocking.length} blocking uncertainties: ${blocking.map(u => u.uncertainty_id).join(", ")}`,
    };
  }
  return {
    check_id: "blocking_uncertainties",
    status: "pass",
    message: "No open blocking uncertainties",
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function evaluateHandoffReadiness(
  pkg: ImplementationHandoffPackage,
  canonicalRefs: SourceArtifactRef[],
  mandatoryTermCount: number,
  missingTerms: string[],
  unresolvedTerms: string[] = [],
  uncertaintyRegister?: UncertaintyRegister,
): HandoffReadinessReport {
  const checks: ReadinessCheck[] = [
    checkSourceRevisions(pkg, canonicalRefs),
    checkContractCoverage(pkg, mandatoryTermCount, missingTerms),
    checkContractProvenance(pkg),
    checkConflictMatrixCoverage(pkg, REQUIRED_FIELD_GROUPS),
    checkClinicalLwwViolations(pkg),
    checkDataModelTypes(pkg),
    checkStateMachineOrphans(pkg),
    checkStateMachineContradictions(pkg),
    checkTaskProvenance(pkg),
    checkForbiddenAssumptions(pkg),
    checkRiskNotes(pkg),
    checkUnresolvedStructuralTerms(unresolvedTerms),
    checkBlockingUncertainties(uncertaintyRegister),
  ];

  const critical_violations = checks
    .filter(c => c.status === "fail")
    .map(c => c.message);

  const hasFail = checks.some(c => c.status === "fail");
  const hasWarning = checks.some(c => c.status === "warning");

  let status: "ready" | "ready_with_risks" | "not_ready";
  if (hasFail) {
    status = "not_ready";
  } else if (hasWarning) {
    status = "ready_with_risks";
  } else {
    status = "ready";
  }

  return {
    status,
    checks,
    critical_violations,
    generated_at: new Date().toISOString(),
  };
}
