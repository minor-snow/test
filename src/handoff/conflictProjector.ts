/**
 * Conflict Policy Matrix Projector — Deterministic field-level strategy
 *
 * ref: P11a-003
 *
 * Rules:
 *   - Clinical/case/vet fields → vector_clock
 *   - Metadata/UI fields → last_writer_wins
 *   - sync_cursor → server_token
 *   - retry_attempt_count → local_only
 *   - conflict-sensitive fields → audit_required = true
 *   - Every entry has source block provenance
 */

import type { Artifact } from "../types.js";
import type { ConflictPolicy, ConflictPolicyEntry } from "./types.js";

// ---------------------------------------------------------------------------
// Field group definitions (deterministic)
// ---------------------------------------------------------------------------

type FieldGroupDef = {
  field_group: string;
  fields: string[];
  policy: ConflictPolicy;
  rationale: string;
  risk_level: "low" | "medium" | "high";
  user_visible_on_conflict: boolean;
  audit_required: boolean;
  keywords: string[];
};

const FIELD_GROUPS: FieldGroupDef[] = [
  {
    field_group: "patient_case_status",
    fields: ["case_status", "triage_urgency", "case_priority"],
    policy: "vector_clock",
    rationale: "Clinical case status changes are safety-critical; concurrent edits must be detected and reviewed.",
    risk_level: "high",
    user_visible_on_conflict: true,
    audit_required: true,
    keywords: ["case status", "triage", "urgency", "priority"],
  },
  {
    field_group: "vet_note_summary",
    fields: ["remote_vet_note", "case_note_summary", "clinical_notes"],
    policy: "vector_clock",
    rationale: "Veterinary edits are clinical changes and must not be overwritten by LWW.",
    risk_level: "high",
    user_visible_on_conflict: true,
    audit_required: true,
    keywords: ["vet note", "clinical note", "case note", "veterinary"],
  },
  {
    field_group: "triage_report_body",
    fields: ["triage_result", "symptom_assessment", "species_evaluation"],
    policy: "vector_clock",
    rationale: "Triage report body contains clinical assessment; must preserve causal history.",
    risk_level: "high",
    user_visible_on_conflict: true,
    audit_required: true,
    keywords: ["triage report", "triage result", "symptom", "assessment"],
  },
  {
    field_group: "risk_level",
    fields: ["risk_level", "severity_score", "clinical_risk"],
    policy: "vector_clock",
    rationale: "Risk level directly affects clinical decisions and treatment pathways.",
    risk_level: "high",
    user_visible_on_conflict: true,
    audit_required: true,
    keywords: ["risk level", "severity", "clinical risk"],
  },
  {
    field_group: "suspected_condition",
    fields: ["suspected_condition", "differential_diagnosis", "condition_tags"],
    policy: "vector_clock",
    rationale: "Suspected conditions are clinical judgment; concurrent edits require review.",
    risk_level: "high",
    user_visible_on_conflict: true,
    audit_required: true,
    keywords: ["suspected condition", "diagnosis", "condition"],
  },
  {
    field_group: "pending_report_state",
    fields: ["status", "report_state"],
    policy: "vector_clock",
    rationale: "Report lifecycle state drives sync and conflict behavior; must not be silently overwritten.",
    risk_level: "medium",
    user_visible_on_conflict: true,
    audit_required: true,
    keywords: ["pending", "report state", "report status", "lifecycle"],
  },
  {
    field_group: "sync_cursor",
    fields: ["sync_cursor", "pull_cursor", "server_cursor", "next_token"],
    policy: "server_token",
    rationale: "Sync cursor is server-authoritative; client always accepts server's value.",
    risk_level: "low",
    user_visible_on_conflict: false,
    audit_required: false,
    keywords: ["sync cursor", "pull cursor", "server cursor", "next token", "cursor", "server-authoritative"],
  },
  {
    field_group: "retry_attempt_count",
    fields: ["retry_count", "attempt_number", "retry_attempt_count"],
    policy: "local_only",
    rationale: "Retry counts are device-local state; never synced or merged.",
    risk_level: "low",
    user_visible_on_conflict: false,
    audit_required: false,
    keywords: ["retry count", "attempt", "retry"],
  },
  {
    field_group: "last_viewed_screen",
    fields: ["last_viewed_screen", "last_active_tab", "ui_state"],
    policy: "last_writer_wins",
    rationale: "UI navigation state is non-clinical metadata; latest value is sufficient.",
    risk_level: "low",
    user_visible_on_conflict: false,
    audit_required: false,
    keywords: ["last viewed", "ui state", "screen", "tab"],
  },
  {
    field_group: "local_cache_timestamp",
    fields: ["local_cache_timestamp", "last_sync_at", "updated_at"],
    policy: "last_writer_wins",
    rationale: "Cache timestamps are operational metadata; LWW is safe.",
    risk_level: "low",
    user_visible_on_conflict: false,
    audit_required: false,
    keywords: ["cache timestamp", "last sync", "updated at"],
  },
  {
    field_group: "clinic_replica_id",
    fields: ["clinic_replica_id", "clinic_id", "backend_id"],
    policy: "server_token",
    rationale: "Clinic identity is server-assigned; client accepts server value.",
    risk_level: "low",
    user_visible_on_conflict: false,
    audit_required: false,
    keywords: ["clinic replica", "clinic id", "backend id"],
  },
  {
    field_group: "device_id",
    fields: ["device_id", "android_device_id"],
    policy: "local_only",
    rationale: "Device ID is device-local; never overwritten by sync.",
    risk_level: "low",
    user_visible_on_conflict: false,
    audit_required: false,
    keywords: ["device id", "device identifier"],
  },
  {
    field_group: "actor_id",
    fields: ["actor_id", "clinician_id", "user_id"],
    policy: "local_only",
    rationale: "Actor identity is set at login; not subject to sync conflict.",
    risk_level: "low",
    user_visible_on_conflict: false,
    audit_required: false,
    keywords: ["actor id", "clinician id", "user id"],
  },
];

// ---------------------------------------------------------------------------
// Block scanner
// ---------------------------------------------------------------------------

function findBlocksContaining(artifact: Artifact, keywords: string[]): string[] {
  const matched: string[] = [];
  for (const sec of artifact.sections) {
    for (const b of sec.commitments) {
      const text = `${b.text} ${b.rationale || ""}`.toLowerCase();
      if (keywords.some(kw => text.includes(kw.toLowerCase()))) {
        matched.push(b.block_id);
      }
    }
  }
  return matched;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type ConflictProjectionResult = {
  matrix: ConflictPolicyEntry[];
  field_groups_covered: number;
  field_groups_total: number;
  clinical_lww_violations: string[];
};

export function projectConflictPolicyMatrix(
  architecture: Artifact,
  interfaceSpec: Artifact,
  moduleSpec: Artifact,
): ConflictProjectionResult {
  const matrix: ConflictPolicyEntry[] = [];
  const clinical_lww_violations: string[] = [];

  for (const fg of FIELD_GROUPS) {
    const archBlocks = findBlocksContaining(architecture, fg.keywords);
    const ifaceBlocks = findBlocksContaining(interfaceSpec, fg.keywords);
    const modBlocks = findBlocksContaining(moduleSpec, fg.keywords);

    matrix.push({
      field_group: fg.field_group,
      fields: fg.fields,
      policy: fg.policy,
      rationale: fg.rationale,
      risk_level: fg.risk_level,
      user_visible_on_conflict: fg.user_visible_on_conflict,
      audit_required: fg.audit_required,
      source_architecture_blocks: archBlocks,
      source_interface_blocks: ifaceBlocks,
      source_module_blocks: modBlocks,
    });

    // Clinical LWW violation check
    if (
      fg.risk_level === "high" &&
      fg.policy === "last_writer_wins"
    ) {
      clinical_lww_violations.push(fg.field_group);
    }
  }

  return {
    matrix,
    field_groups_covered: FIELD_GROUPS.length,
    field_groups_total: FIELD_GROUPS.length,
    clinical_lww_violations,
  };
}
