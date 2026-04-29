/**
 * State Machine Projector — Deterministic state/transition definitions
 *
 * ref: P11a-005
 *
 * 3 state machines: PendingReportState, SyncOperationState, ConflictResolutionState
 * All states, transitions, and forbidden transitions are deterministic.
 */

import type { Artifact } from "../types.js";
import type { StateMachineSpec } from "./types.js";

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
// State Machines
// ---------------------------------------------------------------------------

function pendingReportStateMachine(arch: Artifact, iface: Artifact, mod: Artifact): StateMachineSpec {
  return {
    name: "PendingReportState",
    states: [
      "draft",
      "completed_offline",
      "queued_for_sync",
      "syncing",
      "merged",
      "conflicted",
      "requires_review",
      "failed_retryable",
      "failed_terminal",
    ],
    allowed_transitions: [
      { from: "draft", to: "completed_offline", trigger: "triage_completed", audit_event_required: true },
      { from: "completed_offline", to: "queued_for_sync", trigger: "enqueue_for_sync", audit_event_required: false },
      { from: "queued_for_sync", to: "syncing", trigger: "sync_started", audit_event_required: false },
      { from: "syncing", to: "merged", trigger: "sync_accepted", audit_event_required: true },
      { from: "syncing", to: "conflicted", trigger: "conflict_detected", audit_event_required: true },
      { from: "syncing", to: "failed_retryable", trigger: "sync_failed_transient", audit_event_required: false },
      { from: "failed_retryable", to: "queued_for_sync", trigger: "retry_scheduled", audit_event_required: false },
      { from: "failed_retryable", to: "failed_terminal", trigger: "max_retries_exceeded", audit_event_required: true },
      { from: "conflicted", to: "requires_review", trigger: "clinician_review_required", audit_event_required: true },
      { from: "requires_review", to: "merged", trigger: "clinician_resolved", audit_event_required: true },
      { from: "conflicted", to: "merged", trigger: "auto_merge_succeeded", audit_event_required: true },
    ],
    forbidden_transitions: [
      { from: "conflicted", to: "queued_for_sync", reason: "Cannot bypass conflict resolution by re-queueing; must resolve or escalate to review first" },
      { from: "failed_terminal", to: "syncing", reason: "Terminal failure requires manual intervention, not automatic retry" },
      { from: "requires_review", to: "queued_for_sync", reason: "Cannot skip clinician review by re-queueing" },
      { from: "merged", to: "draft", reason: "Merged reports cannot revert to draft" },
      { from: "merged", to: "queued_for_sync", reason: "Already merged; re-sync not permitted" },
    ],
    source_architecture_blocks: findBlocksContaining(arch, ["pending report", "lifecycle", "report state"]),
    source_interface_blocks: findBlocksContaining(iface, ["pending", "lifecycle", "report"]),
    source_module_blocks: findBlocksContaining(mod, ["PendingReportRepository", "report"]),
  };
}

function syncOperationStateMachine(arch: Artifact, iface: Artifact, mod: Artifact): StateMachineSpec {
  return {
    name: "SyncOperationState",
    states: [
      "queued",
      "in_flight",
      "acknowledged",
      "retry_scheduled",
      "conflict_detected",
      "dead_lettered",
    ],
    allowed_transitions: [
      { from: "queued", to: "in_flight", trigger: "upload_started", audit_event_required: false },
      { from: "in_flight", to: "acknowledged", trigger: "server_ack_received", audit_event_required: true },
      { from: "in_flight", to: "conflict_detected", trigger: "conflict_response", audit_event_required: true },
      { from: "in_flight", to: "retry_scheduled", trigger: "transient_failure", audit_event_required: false },
      { from: "retry_scheduled", to: "queued", trigger: "retry_timer_expired", audit_event_required: false },
      { from: "retry_scheduled", to: "dead_lettered", trigger: "max_retries_exceeded", audit_event_required: true },
      { from: "conflict_detected", to: "queued", trigger: "conflict_resolved_requeue", audit_event_required: true },
    ],
    forbidden_transitions: [
      { from: "dead_lettered", to: "queued", reason: "Dead-lettered operations require manual intervention" },
      { from: "acknowledged", to: "in_flight", reason: "Acknowledged operations are terminal" },
      { from: "dead_lettered", to: "in_flight", reason: "Cannot retry dead-lettered operations automatically" },
    ],
    source_architecture_blocks: findBlocksContaining(arch, ["sync queue", "background sync", "retry"]),
    source_interface_blocks: findBlocksContaining(iface, ["sync", "upload", "retry"]),
    source_module_blocks: findBlocksContaining(mod, ["SyncQueueManager", "RetryLedger"]),
  };
}

function conflictResolutionStateMachine(arch: Artifact, iface: Artifact, mod: Artifact): StateMachineSpec {
  return {
    name: "ConflictResolutionState",
    states: [
      "auto_merged",
      "lww_applied",
      "vector_conflict",
      "manual_review_required",
      "clinician_resolved",
    ],
    allowed_transitions: [
      { from: "vector_conflict", to: "auto_merged", trigger: "non_overlapping_fields_merged", audit_event_required: true },
      { from: "vector_conflict", to: "manual_review_required", trigger: "overlapping_clinical_fields", audit_event_required: true },
      { from: "vector_conflict", to: "lww_applied", trigger: "metadata_only_conflict", audit_event_required: true },
      { from: "manual_review_required", to: "clinician_resolved", trigger: "clinician_selected_version", audit_event_required: true },
    ],
    forbidden_transitions: [
      { from: "manual_review_required", to: "auto_merged", reason: "Clinical conflicts cannot be auto-merged; clinician must review" },
      { from: "clinician_resolved", to: "manual_review_required", reason: "Resolution is final; cannot revert to review" },
      { from: "lww_applied", to: "manual_review_required", reason: "LWW resolution is final for metadata" },
    ],
    source_architecture_blocks: findBlocksContaining(arch, ["conflict resolution", "vector clock", "last-writer-wins"]),
    source_interface_blocks: findBlocksContaining(iface, ["conflict", "resolution", "review"]),
    source_module_blocks: findBlocksContaining(mod, ["ConflictResolver", "conflict"]),
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type StateMachineProjectionResult = {
  machines: StateMachineSpec[];
  total_states: number;
  total_transitions: number;
  total_forbidden: number;
  orphan_states: string[];
};

export function projectStateMachines(
  architecture: Artifact,
  interfaceSpec: Artifact,
  moduleSpec: Artifact,
): StateMachineProjectionResult {
  const machines = [
    pendingReportStateMachine(architecture, interfaceSpec, moduleSpec),
    syncOperationStateMachine(architecture, interfaceSpec, moduleSpec),
    conflictResolutionStateMachine(architecture, interfaceSpec, moduleSpec),
  ];

  let totalStates = 0;
  let totalTransitions = 0;
  let totalForbidden = 0;
  const orphanStates: string[] = [];

  for (const m of machines) {
    totalStates += m.states.length;
    totalTransitions += m.allowed_transitions.length;
    totalForbidden += m.forbidden_transitions.length;

    // Check for orphan states (not in any transition)
    const referencedStates = new Set<string>();
    for (const t of m.allowed_transitions) {
      referencedStates.add(t.from);
      referencedStates.add(t.to);
    }
    for (const t of m.forbidden_transitions) {
      referencedStates.add(t.from);
      referencedStates.add(t.to);
    }
    for (const s of m.states) {
      if (!referencedStates.has(s)) {
        orphanStates.push(`${m.name}.${s}`);
      }
    }
  }

  return {
    machines,
    total_states: totalStates,
    total_transitions: totalTransitions,
    total_forbidden: totalForbidden,
    orphan_states: orphanStates,
  };
}
