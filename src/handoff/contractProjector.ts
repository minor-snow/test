/**
 * Contract Definition Projector — Deterministic extraction from P10 artifacts
 *
 * ref: P11a-002
 *
 * Rules:
 *   - Mandatory term list is deterministic
 *   - kind / fields / enum_values are deterministic from block text
 *   - source_*_blocks are deterministic via keyword match
 *   - LLM may ONLY supplement definition text (not structure)
 *   - Unknown structural terms are emitted as gaps
 */

import type { Artifact } from "../types.js";
import type { ContractDefinition, ContractDefinitionKind } from "./types.js";

// ---------------------------------------------------------------------------
// Mandatory contract terms
// ---------------------------------------------------------------------------

type MandatoryTerm = {
  term: string;
  kind: ContractDefinitionKind;
  keywords: string[];
  definition: string;
  fields?: ContractDefinition["fields"];
  enum_values?: ContractDefinition["enum_values"];
};

const MANDATORY_TERMS: MandatoryTerm[] = [
  {
    term: "pending_report",
    kind: "schema",
    keywords: ["pending report", "offline report"],
    definition: "A locally-created triage report that has not yet been confirmed by the backend. Persisted in Room, survives app restart.",
    fields: [
      { name: "report_id", type: "String (UUID)", required: true, description: "Unique identifier for the report" },
      { name: "clinic_id", type: "String", required: true, description: "Target clinic backend identifier" },
      { name: "patient_case_id", type: "String", required: true, description: "Associated patient case" },
      { name: "triage_result", type: "TriageResult", required: true, description: "Output from OfflineDecisionTreeRunner" },
      { name: "status", type: "PendingReportState", required: true, description: "Current lifecycle state" },
      { name: "created_at", type: "Instant", required: true, description: "Local creation timestamp" },
      { name: "vector_clock", type: "Map<String, Int>", required: false, description: "Causal version vector" },
      { name: "retry_count", type: "Int", required: true, description: "Number of sync attempts" },
    ],
  },
  {
    term: "pending_report_state",
    kind: "enum",
    keywords: ["pending", "queued", "syncing", "merged", "conflict", "report state", "report status"],
    definition: "Lifecycle states of a pending report from local creation through sync and conflict resolution.",
    enum_values: [
      { value: "draft", description: "Report being composed locally" },
      { value: "completed_offline", description: "Triage completed, awaiting queue" },
      { value: "queued_for_sync", description: "In sync queue, waiting for connectivity" },
      { value: "syncing", description: "Currently being uploaded to clinic backend" },
      { value: "merged", description: "Successfully merged with backend state" },
      { value: "conflicted", description: "Vector clock conflict detected, needs resolution" },
      { value: "requires_review", description: "Conflict requires clinician manual review" },
      { value: "failed_retryable", description: "Sync failed, will retry with backoff" },
      { value: "failed_terminal", description: "Max retries exceeded, requires manual intervention" },
    ],
  },
  {
    term: "sync_queue",
    kind: "module",
    keywords: ["sync queue", "upload queue", "background sync", "FIFO"],
    definition: "FIFO queue managed by SyncQueueManager. Processes pending reports in order, triggered by ConnectivityObserver.",
  },
  {
    term: "retry_ledger",
    kind: "schema",
    keywords: ["retry ledger", "retry log", "retry attempt", "exponential backoff"],
    definition: "Per-report log of sync attempts. Records timestamp, HTTP status, error code, retry count. Drives exponential backoff.",
    fields: [
      { name: "ledger_entry_id", type: "String (UUID)", required: true, description: "Unique entry identifier" },
      { name: "report_id", type: "String", required: true, description: "Associated pending report" },
      { name: "attempt_number", type: "Int", required: true, description: "Sequential attempt counter" },
      { name: "timestamp", type: "Instant", required: true, description: "When this attempt occurred" },
      { name: "http_status", type: "Int?", required: false, description: "HTTP response status or null if network error" },
      { name: "error_code", type: "String?", required: false, description: "Application-level error code" },
      { name: "next_retry_at", type: "Instant?", required: false, description: "Scheduled next retry (exponential backoff)" },
    ],
  },
  {
    term: "sync_cursor",
    kind: "field",
    keywords: ["sync cursor", "server cursor", "pull cursor", "change cursor", "cursor"],
    definition: "Server-issued opaque token representing the last-known sync position. Used in GET /sync/pull to request only new changes.",
  },
  {
    term: "clinic_replica_id",
    kind: "identifier",
    keywords: ["clinic replica", "clinic id", "clinic backend", "clinic registry"],
    definition: "Unique identifier for a clinic backend instance. Each clinic has independent state and sync endpoint.",
  },
  {
    term: "device_id",
    kind: "identifier",
    keywords: ["device id", "device identifier", "android device", "device"],
    definition: "Unique identifier for the Android device. Used as an actor in vector clock entries.",
  },
  {
    term: "actor_id",
    kind: "identifier",
    keywords: ["actor id", "actor", "clinician id", "user id"],
    definition: "Identity of the user performing an action (clinician ID). Recorded in audit events and vector clock entries.",
  },
  {
    term: "vector_clock",
    kind: "schema",
    keywords: ["vector clock", "version vector", "causal"],
    definition: "Map<ActorId, SequenceNumber> tracking causal history of edits. Used to detect concurrent modifications on clinical fields.",
    fields: [
      { name: "entries", type: "Map<String, Int>", required: true, description: "Actor ID to sequence number mapping" },
    ],
  },
  {
    term: "lww_policy",
    kind: "policy",
    keywords: ["last-writer-wins", "lww", "timestamp resolution"],
    definition: "Conflict resolution policy for non-clinical metadata fields. Latest timestamp wins. Only permitted on fields classified as non-clinical.",
  },
  {
    term: "conflict_payload",
    kind: "schema",
    keywords: ["conflict payload", "conflict response", "both versions"],
    definition: "Server response when a sync upload detects a vector clock conflict. Contains local version, remote version, and conflict metadata.",
    fields: [
      { name: "report_id", type: "String", required: true, description: "Report with conflict" },
      { name: "local_version", type: "ReportSnapshot", required: true, description: "Client's version of the report" },
      { name: "remote_version", type: "ReportSnapshot", required: true, description: "Server's version of the report" },
      { name: "local_clock", type: "VectorClock", required: true, description: "Client's vector clock" },
      { name: "remote_clock", type: "VectorClock", required: true, description: "Server's vector clock" },
      { name: "conflicting_fields", type: "List<String>", required: true, description: "Field names with divergent values" },
    ],
  },
  {
    term: "conflict_type",
    kind: "enum",
    keywords: ["conflict type", "type of conflict", "conflict detection", "conflict detected"],
    definition: "Classification of detected conflicts.",
    enum_values: [
      { value: "vector_clock_divergence", description: "Concurrent edits detected via vector clock" },
      { value: "lww_overwrite", description: "LWW applied to metadata field (informational)" },
      { value: "schema_version_mismatch", description: "Client and server schema versions differ" },
    ],
  },
  {
    term: "resolution_policy",
    kind: "enum",
    keywords: ["resolution policy", "resolution strategy", "resolve conflict"],
    definition: "How a specific conflict should be resolved.",
    enum_values: [
      { value: "auto_merge", description: "Non-overlapping changes merged automatically" },
      { value: "lww_applied", description: "Last-writer-wins applied (metadata only)" },
      { value: "clinician_review", description: "Conflict requires explicit clinician selection" },
    ],
  },
  {
    term: "user_visible_conflict_state",
    kind: "state",
    keywords: ["user-visible conflict", "conflict review", "clinician", "diff view"],
    definition: "UI state where the clinician sees both versions of a conflicted report and must explicitly select a resolution for each conflicting field.",
  },
  {
    term: "audit_event",
    kind: "schema",
    keywords: ["audit event", "audit log", "audit entry"],
    definition: "Immutable record of a system action. Includes timestamp, actor, action type, report ID, and payload checksum.",
    fields: [
      { name: "event_id", type: "String (UUID)", required: true, description: "Unique event identifier" },
      { name: "timestamp", type: "Instant", required: true, description: "When the event occurred" },
      { name: "actor_id", type: "String", required: true, description: "Clinician or system actor" },
      { name: "action_type", type: "String", required: true, description: "Type of action (e.g. triage_created, sync_attempted)" },
      { name: "report_id", type: "String?", required: false, description: "Associated report, if applicable" },
      { name: "payload_checksum", type: "String", required: true, description: "SHA-256 of the event payload" },
    ],
  },
  {
    term: "offline_decision_tree",
    kind: "module",
    keywords: ["decision tree", "triage rules", "local decision", "rule interpreter"],
    definition: "Deterministic rule interpreter (no ML) that evaluates species, symptoms, and urgency to produce a triage result. Rules are versioned and refreshed on connectivity restore.",
  },
  {
    term: "sync_status",
    kind: "state",
    keywords: ["sync status", "sync state", "operation status", "sync operation"],
    definition: "Current state of a sync operation, represented by SyncOperationState enum. Tracks progress from queued through in_flight to acknowledged, conflict_detected, or dead_lettered.",
  },
];

// ---------------------------------------------------------------------------
// Structural term patterns (for unknown term detection)
// ---------------------------------------------------------------------------

const STRUCTURAL_SUFFIXES = [
  "_id", "_state", "_status", "_type", "_policy", "_queue", "_ledger",
  "_cursor", "_token", "_payload", "_entity", "_dto", "_worker",
  "_repository", "_manager", "_resolver", "_observer", "_presenter",
  "_client", "_writer", "_reader", "_registry",
];

// ---------------------------------------------------------------------------
// Block scanner
// ---------------------------------------------------------------------------

function findBlocksContaining(
  artifact: Artifact,
  keywords: string[]
): string[] {
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

function extractAllTermsFromArtifact(artifact: Artifact): Set<string> {
  const terms = new Set<string>();
  for (const sec of artifact.sections) {
    for (const b of sec.commitments) {
      if (Array.isArray(b.terms)) {
        for (const t of b.terms) {
          terms.add(t.toLowerCase().replace(/\s+/g, "_"));
        }
      }
      // Also scan for snake_case structural terms in text
      const text = `${b.text} ${b.rationale || ""}`;
      const matches = text.match(/\b[a-z][a-z0-9]*(?:_[a-z][a-z0-9]*)+\b/g);
      if (matches) {
        for (const m of matches) {
          if (STRUCTURAL_SUFFIXES.some(s => m.endsWith(s))) {
            terms.add(m);
          }
        }
      }
    }
  }
  return terms;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type ContractProjectionResult = {
  definitions: ContractDefinition[];
  unknown_structural_terms: string[];
  mandatory_coverage: { total: number; covered: number; missing: string[] };
};

export function projectContractDefinitions(
  architecture: Artifact,
  interfaceSpec: Artifact,
  moduleSpec: Artifact,
): ContractProjectionResult {
  const definitions: ContractDefinition[] = [];
  const missing: string[] = [];

  for (const mt of MANDATORY_TERMS) {
    const archBlocks = findBlocksContaining(architecture, mt.keywords);
    const ifaceBlocks = findBlocksContaining(interfaceSpec, mt.keywords);
    const modBlocks = findBlocksContaining(moduleSpec, mt.keywords);

    const totalRefs = archBlocks.length + ifaceBlocks.length + modBlocks.length;

    if (totalRefs === 0) {
      missing.push(mt.term);
      continue;
    }

    const def: ContractDefinition = {
      term: mt.term,
      kind: mt.kind,
      definition: mt.definition,
      source_architecture_blocks: archBlocks,
      source_interface_blocks: ifaceBlocks,
      source_module_blocks: modBlocks,
    };

    if (mt.fields) def.fields = mt.fields;
    if (mt.enum_values) def.enum_values = mt.enum_values;

    definitions.push(def);
  }

  // Scan for unknown structural terms
  const knownTerms = new Set(MANDATORY_TERMS.map(mt => mt.term));
  const allTerms = new Set<string>();
  for (const artifact of [architecture, interfaceSpec, moduleSpec]) {
    for (const t of extractAllTermsFromArtifact(artifact)) {
      allTerms.add(t);
    }
  }

  const unknown_structural_terms = [...allTerms]
    .filter(t => !knownTerms.has(t))
    .filter(t => STRUCTURAL_SUFFIXES.some(s => t.endsWith(s)))
    .sort();

  return {
    definitions,
    unknown_structural_terms,
    mandatory_coverage: {
      total: MANDATORY_TERMS.length,
      covered: definitions.length,
      missing,
    },
  };
}
