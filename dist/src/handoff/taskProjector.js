/**
 * Implementation Task Projector — Deterministic task definitions
 *
 * ref: P11a-006
 *
 * Tasks are 100% deterministic. No LLM generation.
 * Each task has source blocks, acceptance criteria, and required tests.
 */
// ---------------------------------------------------------------------------
// Block scanner
// ---------------------------------------------------------------------------
function findBlocksContaining(artifact, keywords) {
    const matched = [];
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
function allBlocks(...artifacts) {
    return (kws) => {
        const all = [];
        for (const a of artifacts)
            all.push(...findBlocksContaining(a, kws));
        return all;
    };
}
// ---------------------------------------------------------------------------
// Task definitions
// ---------------------------------------------------------------------------
export function projectImplementationTasks(architecture, interfaceSpec, moduleSpec) {
    const find = allBlocks(architecture, interfaceSpec, moduleSpec);
    return [
        {
            task_id: "TASK-001",
            title: "Define offline triage data models",
            target_module: "data",
            description: "Create Room entity classes for PendingReportEntity, SyncOperationEntity, RetryLedgerEntry, ConflictRecordEntity, VectorClockEntry, and AuditEventEntity. Create network DTO classes for OfflineReportEnvelope, SyncChangePullRequest/Response, SyncUploadRequest/Result, SyncAckRequest, ConflictPayload, and VersionMetadata. Define all enums: PendingReportState, SyncOperationState, ConflictResolutionState, ConflictType.",
            source_blocks: find(["pending report", "sync", "conflict", "audit", "vector clock", "retry"]),
            acceptance_criteria: [
                "All 6 Room entities compile and have @Entity annotation",
                "All 8 network DTOs are serializable to JSON",
                "All enum values match the state machine definitions exactly",
                "Primary keys and indexes match DataModelSpec",
                "No field uses an undefined type",
            ],
            required_tests: [
                "Room entity insert/query round-trip test",
                "DTO JSON serialization/deserialization test",
                "Enum exhaustiveness test (all values covered in when/switch)",
            ],
        },
        {
            task_id: "TASK-002",
            title: "Implement PendingReportRepository",
            target_module: "persistence",
            description: "Implement the PendingReportRepository using Room DAO. Must support: insert new report, update status, query by status, query all pending for sync, delete merged reports (optional cleanup). All operations must be suspend functions for coroutine compatibility.",
            source_blocks: find(["PendingReportRepository", "pending report", "local persistence"]),
            acceptance_criteria: [
                "Insert creates report with status 'draft' and retry_count=0",
                "Update status transitions are validated against PendingReportState machine",
                "Query by status returns correct subset",
                "Reports survive process kill (Room persistence verified)",
                "No blocking operations on main thread",
            ],
            required_tests: [
                "Insert and retrieve by ID",
                "Status transition: draft → completed_offline → queued_for_sync",
                "Query all reports with status 'queued_for_sync'",
                "Reject invalid transition: merged → draft",
            ],
        },
        {
            task_id: "TASK-003",
            title: "Implement OfflineDecisionTreeRunner",
            target_module: "triage",
            description: "Implement the deterministic rule interpreter for offline triage. Takes species, symptoms, and urgency as input. Produces a TriageResult. Rules are versioned and loaded from bundled assets, refreshed from backend on connectivity restore. No machine learning — pure rule evaluation.",
            source_blocks: find(["decision tree", "offline triage", "rule interpreter", "deterministic"]),
            acceptance_criteria: [
                "Same input always produces same output (deterministic)",
                "Rule version is tracked and available for display",
                "Rules can be refreshed from network without app restart",
                "Triage result includes confidence and reasoning chain",
                "No network call required during triage execution",
            ],
            required_tests: [
                "Determinism test: same input → same output across runs",
                "Rule version tracking test",
                "Multiple species/symptom combinations test",
                "Edge case: empty symptoms list",
            ],
        },
        {
            task_id: "TASK-004",
            title: "Implement SyncQueueManager and RetryLedger",
            target_module: "sync",
            description: "Implement the FIFO sync queue using WorkManager or equivalent background scheduler. Process pending reports in order. Record each attempt in RetryLedger. Implement exponential backoff. Trigger sync on connectivity restore via ConnectivityObserver. All network operations on background coroutine.",
            source_blocks: find(["sync queue", "background sync", "retry ledger", "exponential backoff", "FIFO"]),
            acceptance_criteria: [
                "Reports are processed in FIFO order",
                "Each sync attempt creates a RetryLedgerEntry",
                "Exponential backoff doubles delay on each failure",
                "Max retries exceeded → status transitions to failed_terminal",
                "UI thread is never blocked by sync operations",
                "Sync triggers automatically on connectivity restore",
            ],
            required_tests: [
                "FIFO ordering test with 3+ queued reports",
                "Retry ledger records attempt details",
                "Backoff delay calculation test",
                "Max retries → terminal failure transition",
                "ConnectivityObserver triggers re-sync",
            ],
        },
        {
            task_id: "TASK-005",
            title: "Implement ConflictResolver with hybrid policy",
            target_module: "conflict",
            description: "Implement the hybrid conflict resolution engine. Vector clock comparison for clinical fields. LWW for metadata fields. Auto-merge for non-overlapping changes. Escalate overlapping clinical conflicts to clinician review. Store ConflictRecordEntity locally. Never auto-resolve clinical field conflicts.",
            source_blocks: find(["conflict resolution", "vector clock", "last-writer-wins", "hybrid", "clinical", "clinician"]),
            acceptance_criteria: [
                "Clinical field conflicts always require clinician review",
                "Metadata-only conflicts resolve via LWW automatically",
                "Non-overlapping changes auto-merge correctly",
                "ConflictRecordEntity persisted with both versions",
                "Audit event generated for every conflict detection and resolution",
                "Field classification matches conflict_policy_matrix exactly",
            ],
            required_tests: [
                "Clinical field conflict → requires_review",
                "Metadata-only conflict → lww_applied",
                "Non-overlapping fields → auto_merged",
                "Mixed clinical + metadata → clinical part requires review",
                "Audit event generation test",
                "ConflictPayload storage test",
            ],
        },
        {
            task_id: "TASK-006",
            title: "Implement ClinicReplicaClient DTOs and network layer",
            target_module: "network",
            description: "Implement the multi-clinic network client. Maintain clinic registry with base URLs and auth tokens. Support POST /sync/upload, GET /sync/pull, POST /sync/ack, POST /sync/resolve. Route requests to correct clinic backend based on clinic_id. Validate registry before use.",
            source_blocks: find(["ClinicReplicaClient", "clinic backend", "multi-clinic", "registry"]),
            acceptance_criteria: [
                "Requests routed to correct clinic based on clinic_id",
                "Auth tokens included in all requests",
                "Registry validation rejects stale/missing entries",
                "All 4 endpoints implemented (upload, pull, ack, resolve)",
                "Network errors return structured error codes",
            ],
            required_tests: [
                "Routing test: different clinic_ids → different base URLs",
                "Auth token inclusion test",
                "Stale registry rejection test",
                "Network error handling test",
            ],
        },
        {
            task_id: "TASK-007",
            title: "Implement AuditEventWriter",
            target_module: "audit",
            description: "Implement the audit event writer. Generate immutable audit events for: triage creation, sync attempt, sync success, sync failure, conflict detection, conflict resolution, clinician review. Each event includes timestamp, actor_id, action_type, report_id, and SHA-256 payload checksum.",
            source_blocks: find(["audit event", "audit log", "traceability", "checksum"]),
            acceptance_criteria: [
                "All 7 action types generate correct events",
                "Events are immutable (no update/delete operations)",
                "Payload checksum is SHA-256",
                "Events persist in Room database",
                "actor_id is always populated (clinician or 'system')",
            ],
            required_tests: [
                "Event generation for each action type",
                "Checksum consistency test",
                "Immutability test: no update method exposed",
                "Query by action_type and report_id",
            ],
        },
        {
            task_id: "TASK-008",
            title: "Add state-machine and conflict-resolution unit tests",
            target_module: "test",
            description: "Comprehensive unit test suite covering all 3 state machines and the conflict resolver. Verify all allowed transitions, all forbidden transitions, audit event requirements, and edge cases. Include property-based tests for vector clock merge.",
            source_blocks: find(["state", "transition", "conflict", "forbidden", "vector clock"]),
            acceptance_criteria: [
                "Every allowed transition tested",
                "Every forbidden transition tested (must throw/reject)",
                "Audit event requirement verified for flagged transitions",
                "Vector clock merge produces correct result",
                "No orphan states (every state reachable)",
            ],
            required_tests: [
                "PendingReportState: all 11 transitions",
                "PendingReportState: all 5 forbidden transitions",
                "SyncOperationState: all 7 transitions",
                "SyncOperationState: all 3 forbidden transitions",
                "ConflictResolutionState: all 4 transitions",
                "ConflictResolutionState: all 3 forbidden transitions",
                "Vector clock merge: concurrent edits test",
                "Vector clock merge: causally ordered test",
            ],
        },
        {
            task_id: "TASK-009",
            title: "Implement UserConflictReviewPresenter",
            target_module: "ui",
            description: "Implement the conflict review UI screen. Display both local and remote versions side-by-side with field-level diff highlighting. Require clinician to explicitly select a version for each conflicting field. Submit resolution via POST /sync/resolve. Generate audit event on resolution.",
            source_blocks: find(["conflict review", "diff view", "clinician", "user-visible", "explicit"]),
            acceptance_criteria: [
                "Both versions displayed with clear diff highlighting",
                "Each conflicting field requires explicit selection",
                "Cannot submit without resolving all fields",
                "Resolution generates audit event with clinician actor_id",
                "POST /sync/resolve called with updated vector clock",
            ],
            required_tests: [
                "UI displays both versions correctly",
                "Submit blocked until all fields resolved",
                "Resolution generates correct audit event",
                "Vector clock updated after resolution",
            ],
        },
        {
            task_id: "TASK-010",
            title: "Implement ConnectivityObserver and auto-sync trigger",
            target_module: "infrastructure",
            description: "Monitor network connectivity using Android ConnectivityManager. Notify SyncQueueManager when connectivity restores. Debounce rapid connectivity changes. Do not trigger sync if queue is empty.",
            source_blocks: find(["connectivity", "network", "restore", "trigger", "observer"]),
            acceptance_criteria: [
                "Connectivity change detected within 1 second",
                "SyncQueueManager notified on restore",
                "Rapid on/off changes debounced",
                "No sync triggered if queue is empty",
                "Works with both WiFi and cellular",
            ],
            required_tests: [
                "Connectivity restore triggers sync",
                "Debounce test: rapid changes",
                "Empty queue: no sync triggered",
            ],
        },
    ];
}
//# sourceMappingURL=taskProjector.js.map