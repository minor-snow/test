/**
 * Pet triage seed artifacts.
 *
 * Manual translation of the original "single backend, online-first, strong
 * sync" pet triage app into Pantheon Artifact JSON.
 *
 * Source basis:
 *   - H:/Boom/pet/petSystem/app/src/main/java/com/example/petsystem/MainActivity.kt
 *   - H:/Boom/pet/petSystem/app/src/main/java/com/example/petsystem/VetNet.java
 */

import { computeBlockContentHash, computeRevisionId } from "../hash.js";
import type { Artifact, ArtifactSection, CommitmentBlock } from "../types.js";

function makeBlock(
  id: string,
  type: CommitmentBlock["type"],
  text: string,
  opts?: {
    rationale?: string;
    terms?: string[];
    linked_architecture_blocks?: string[];
  }
): CommitmentBlock {
  const block: CommitmentBlock = {
    block_id: id,
    type,
    text,
    rationale: opts?.rationale,
    terms: opts?.terms,
    linked_architecture_blocks: opts?.linked_architecture_blocks,
    status: "approved",
    content_hash: "",
  };
  block.content_hash = computeBlockContentHash(block);
  return block;
}

function makeSection(
  sectionId: string,
  title: string,
  commitments: CommitmentBlock[]
): ArtifactSection {
  return {
    section_id: sectionId,
    title,
    commitments,
  };
}

export function createPetArchitectureSeed(): Artifact {
  const sections: ArtifactSection[] = [
    makeSection("sec_client_flow", "Client Triage Flow", [
      makeBlock(
        "b_pet_arch_001",
        "mechanism",
        "The Android client collects species, temperature, and free-text symptom description locally, and only submits a triage request when the operator explicitly starts analysis.",
        {
          rationale: "Mirrors DiagnoseScreen input collection before the VetNet call.",
          terms: ["android_client", "species", "temperature", "symptom_description", "triage_request"],
        }
      ),
      makeBlock(
        "b_pet_arch_002",
        "constraint",
        "All client triage decisions must request the backend triage engine in real time before any diagnosis result is shown to the operator.",
        {
          rationale: "The current app computes diagnosis by calling VetNet.diagnose and does not host a client-side decision engine.",
          terms: ["online_first", "triage_engine", "strong_sync", "backend_authority"],
        }
      ),
      makeBlock(
        "b_pet_arch_003",
        "mechanism",
        "After a successful backend response, the client stores the symptom description, returned risk level, first suspected condition, and optional temperature in local Room tables.",
        {
          rationale: "MainActivity writes HistoryRecord and VitalRecord only inside the success callback.",
          terms: ["room_cache", "history_table", "vitals_table", "risk_level", "suspected_condition"],
        }
      ),
    ]),
    makeSection("sec_network_authority", "Network Authority and Availability", [
      makeBlock(
        "b_pet_arch_004",
        "constraint",
        "When the network is unavailable, the client must lock the triage screen to prevent dirty data and incomplete reports from being treated as valid triage output.",
        {
          rationale: "The original workflow has no offline completion path and treats network failure as a hard stop.",
          terms: ["network_lock", "dirty_data", "incomplete_report", "connectivity_failure"],
        }
      ),
      makeBlock(
        "b_pet_arch_005",
        "constraint",
        "A failed backend call ends the triage attempt with UI error feedback, and the client must not persist a diagnosis or pending report when no authoritative response was returned.",
        {
          rationale: "The error callback only surfaces a toast and leaves diagnosisResult unset.",
          terms: ["error_feedback", "pending_report", "authoritative_response"],
        }
      ),
      makeBlock(
        "b_pet_arch_006",
        "invariant",
        "The system depends on a single backend diagnosis engine; no secondary clinic node, replica, or embedded fallback engine participates in decision making.",
        {
          rationale: "VetNet is configured against one BASE_URL and no alternate authority exists in the mobile app.",
          terms: ["single_backend", "replica", "fallback_engine", "base_url"],
        }
      ),
    ]),
    makeSection("sec_local_storage", "Local Storage Boundary", [
      makeBlock(
        "b_pet_arch_007",
        "invariant",
        "Local Room storage is a record cache for history_table and vitals_table, not an authoritative triage decision source.",
        {
          rationale: "The app reads local history and recent temperatures, but diagnosis generation still depends on the backend call.",
          terms: ["room_cache", "history_table", "vitals_table", "authoritative_source"],
        }
      ),
      makeBlock(
        "b_pet_arch_008",
        "constraint",
        "The client must not execute the multi-step triage tree offline or cache partially completed decision branches for later merge.",
        {
          rationale: "The current design contains no offline decision tree state, queue, or merge semantics.",
          terms: ["decision_tree", "offline_flow", "partial_branch", "merge"],
        }
      ),
      makeBlock(
        "b_pet_arch_009",
        "mechanism",
        "Recent temperature history is rendered locally from vitals_table for dashboard display and does not trigger backend recomputation by itself.",
        {
          rationale: "HomeScreen reads the latest VitalRecord entries from Room LiveData.",
          terms: ["recent_vitals", "dashboard", "vitals_table"],
        }
      ),
    ]),
    makeSection("sec_backend_contract", "Backend Decision Contract", [
      makeBlock(
        "b_pet_arch_010",
        "interface",
        "The diagnosis engine accepts description, species, and optional temperature in one synchronous request and returns risk_level, suspected_conditions, rationale, and next_steps in one response.",
        {
          rationale: "This is the concrete request and response shape encoded in VetNet CaseRequest and DiagnosisResponse.",
          terms: ["diagnose_request", "risk_level", "suspected_conditions", "rationale", "next_steps"],
        }
      ),
      makeBlock(
        "b_pet_arch_011",
        "decision",
        "The first suspected condition from the backend response is persisted as the local condition summary shown in the history view.",
        {
          rationale: "MainActivity persists response.suspected_conditions.firstOrNull() as the condition field.",
          terms: ["local_condition_summary", "history_view", "suspected_conditions"],
        }
      ),
      makeBlock(
        "b_pet_arch_012",
        "constraint",
        "The client treats the backend response as the only valid diagnosis payload and does not merge server output with locally edited medical state.",
        {
          rationale: "The original design has no client-side conflict handling or multi-source reconciliation.",
          terms: ["server_authority", "diagnosis_payload", "conflict_handling"],
        }
      ),
    ]),
    makeSection("sec_sync_model", "Synchronization Model", [
      makeBlock(
        "b_pet_arch_013",
        "invariant",
        "The v1 system has no background sync queue, no retry ledger, and no per-record version vector for triage data.",
        {
          rationale: "Neither the Android client nor the backend adapter model deferred writes or replicated history reconciliation.",
          terms: ["background_sync", "retry_queue", "version_vector", "replication"],
        }
      ),
      makeBlock(
        "b_pet_arch_014",
        "risk",
        "Any loss of connectivity during triage blocks completion because the architecture couples diagnosis generation to immediate server availability.",
        {
          rationale: "The operator cannot obtain a result if VetNet fails.",
          terms: ["availability_risk", "connectivity_loss", "server_availability"],
        }
      ),
      makeBlock(
        "b_pet_arch_015",
        "constraint",
        "The system assumes a single authoritative write path, so concurrent edits from another clinic are outside the v1 design envelope.",
        {
          rationale: "No multi-clinic or multi-writer protocol exists in the original implementation.",
          terms: ["single_writer", "multi_clinic", "concurrent_edit"],
        }
      ),
    ]),
    makeSection("sec_operational_risks", "Operational Risks and Gaps", [
      makeBlock(
        "b_pet_arch_016",
        "risk",
        "The mobile adapter is coupled to one HTTP diagnosis endpoint and one backend model runtime, which creates a single point of failure for all triage decisions.",
        {
          rationale: "VetNet configures exactly one BASE_URL and one OkHttp request path.",
          terms: ["http_endpoint", "single_point_of_failure", "okhttp"],
        }
      ),
      makeBlock(
        "b_pet_arch_017",
        "risk",
        "Because no pending report exists, operators must re-enter symptoms after a timeout or disconnect, increasing abandonment and data loss risk.",
        {
          rationale: "The app neither stores an offline draft nor resumes failed submissions.",
          terms: ["timeout", "reentry_risk", "data_loss", "abandonment"],
        }
      ),
      makeBlock(
        "b_pet_arch_018",
        "open_question",
        "Conflict resolution, offline report drafting, and multi-clinic replication are intentionally undefined in v1.",
        {
          rationale: "These gaps are exactly the seams that an offline-first evolution would need to redesign.",
          terms: ["conflict_resolution", "offline_report", "multi_clinic_replication"],
        }
      ),
    ]),
  ];

  const artifact: Artifact = {
    artifact_id: "pet_triage_architecture",
    artifact_type: "ArchitectureDraft",
    schema_version: "architecture_draft@0.1.0",
    revision_id: "",
    sections,
    metadata: {
      created_by: "human",
      created_at: "2026-04-26T00:00:00Z",
      tags: ["pet-system", "v1", "seed", "seed_rev_001"],
      notes:
        "Manual translation of the original petSystem online-first architecture. " +
        "This is the approved seed baseline for future offline-first P10 evolution.",
    },
  };

  artifact.revision_id = computeRevisionId(artifact);
  return artifact;
}

export function createPetInterfaceSpecSeed(): Artifact {
  const sections: ArtifactSection[] = [
    makeSection("sec_submit_api", "Triage Submit API", [
      makeBlock(
        "b_pet_iface_001",
        "interface",
        "POST /triage/submit accepts a JSON body with description:string, species:string, and optional temperature:number.",
        {
          rationale: "This is the normalized REST form of the VetNet request payload used by the Android client.",
          terms: ["triage_submit", "description", "species", "temperature"],
          linked_architecture_blocks: ["b_pet_arch_001", "b_pet_arch_010"],
        }
      ),
      makeBlock(
        "b_pet_iface_002",
        "interface",
        "POST /triage/submit is synchronous: the request blocks until the backend triage engine returns the final diagnosis payload or fails.",
        {
          rationale: "The original app waits on one OkHttp callback and has no async acceptance handshake.",
          terms: ["synchronous_api", "triage_engine", "strong_sync"],
          linked_architecture_blocks: ["b_pet_arch_002", "b_pet_arch_010"],
        }
      ),
      makeBlock(
        "b_pet_iface_003",
        "interface",
        "A successful 200 response contains risk_level, suspected_conditions[], rationale, and next_steps for one completed triage decision.",
        {
          rationale: "Matches the DiagnosisResponse fields shown in the UI.",
          terms: ["risk_level", "suspected_conditions", "rationale", "next_steps"],
          linked_architecture_blocks: ["b_pet_arch_010", "b_pet_arch_011"],
        }
      ),
      makeBlock(
        "b_pet_iface_004",
        "interface",
        "The client must not commit a local diagnosis record until a successful response from POST /triage/submit has been parsed.",
        {
          rationale: "HistoryRecord and VitalRecord are written only after onSuccess.",
          terms: ["local_commit", "history_record", "success_response"],
          linked_architecture_blocks: ["b_pet_arch_003", "b_pet_arch_005"],
        }
      ),
    ]),
    makeSection("sec_failure_contract", "Failure Contract", [
      makeBlock(
        "b_pet_iface_005",
        "interface",
        "Network timeout or transport failure is terminal for that triage attempt and returns no authoritative diagnosis payload.",
        {
          rationale: "The mobile client surfaces an error and leaves the triage unresolved.",
          terms: ["network_timeout", "transport_failure", "terminal_failure"],
          linked_architecture_blocks: ["b_pet_arch_004", "b_pet_arch_005", "b_pet_arch_014"],
        }
      ),
      makeBlock(
        "b_pet_iface_006",
        "interface",
        "The interface exposes no offline submission endpoint, no deferred upload token, and no queue handshake for later replay.",
        {
          rationale: "v1 is online-first and strong-sync only.",
          terms: ["offline_submission", "deferred_upload", "queue_handshake"],
          linked_architecture_blocks: ["b_pet_arch_008", "b_pet_arch_013"],
        }
      ),
      makeBlock(
        "b_pet_iface_007",
        "interface",
        "The contract exposes no conflict metadata such as version vectors, last-writer markers, or server change tokens.",
        {
          rationale: "There is no protocol for reconciling concurrent clinic updates in v1.",
          terms: ["version_vector", "last_writer_wins", "change_token", "conflict_metadata"],
          linked_architecture_blocks: ["b_pet_arch_013", "b_pet_arch_015", "b_pet_arch_018"],
        }
      ),
    ]),
    makeSection("sec_client_persistence", "Client Persistence Semantics", [
      makeBlock(
        "b_pet_iface_008",
        "interface",
        "On success the client stores a history summary with date, symptoms, riskLevel, and condition, and may also append one temperature vital locally.",
        {
          rationale: "This mirrors the Room insert behavior after diagnosis success.",
          terms: ["history_summary", "riskLevel", "condition", "temperature_vital"],
          linked_architecture_blocks: ["b_pet_arch_003", "b_pet_arch_007", "b_pet_arch_011"],
        }
      ),
      makeBlock(
        "b_pet_iface_009",
        "interface",
        "On failure the client may display an error toast, but it must not create a pending report, partial triage record, or synthetic diagnosis.",
        {
          rationale: "v1 errors are terminal and no offline artifact is created.",
          terms: ["error_toast", "partial_triage", "synthetic_diagnosis"],
          linked_architecture_blocks: ["b_pet_arch_004", "b_pet_arch_005", "b_pet_arch_017"],
        }
      ),
      makeBlock(
        "b_pet_iface_010",
        "interface",
        "The interface contract assumes one backend authority for each triage decision and does not define reconciliation between clinic replicas.",
        {
          rationale: "This keeps the seed faithful to the original single-backend design.",
          terms: ["backend_authority", "clinic_replica", "reconciliation"],
          linked_architecture_blocks: ["b_pet_arch_006", "b_pet_arch_015", "b_pet_arch_018"],
        }
      ),
    ]),
  ];

  const artifact: Artifact = {
    artifact_id: "pet_triage_interface",
    artifact_type: "InterfaceSpec",
    schema_version: "interface_spec@0.1.0",
    revision_id: "",
    sections,
    metadata: {
      created_by: "human",
      created_at: "2026-04-26T00:00:00Z",
      tags: ["pet-system", "v1", "seed", "seed_rev_001"],
      notes:
        "Synchronous REST contract translated from the original VetNet call path. " +
        "This seed intentionally captures the strong-sync baseline before offline-first redesign.",
    },
  };

  artifact.revision_id = computeRevisionId(artifact);
  return artifact;
}
