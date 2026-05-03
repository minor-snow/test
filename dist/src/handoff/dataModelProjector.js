/**
 * Data Model Projector — Room entities + Network DTOs
 *
 * ref: P11a-004
 *
 * All models, fields, and invariants are deterministic.
 * conflict_policy per field is derived from conflictProjector output.
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
// ---------------------------------------------------------------------------
// Room Entities (6)
// ---------------------------------------------------------------------------
function roomEntities(arch, iface, mod) {
    return [
        {
            name: "PendingReportEntity",
            kind: "room_entity",
            fields: [
                { name: "report_id", type: "String", nullable: false, primary_key: true, description: "UUID primary key" },
                { name: "clinic_id", type: "String", nullable: false, indexed: true, description: "Target clinic backend" },
                { name: "patient_case_id", type: "String", nullable: false, indexed: true, description: "Associated patient case" },
                { name: "triage_result_json", type: "String", nullable: false, description: "Serialized TriageResult from decision tree" },
                { name: "status", type: "String", nullable: false, indexed: true, description: "PendingReportState enum value", conflict_policy: "vector_clock" },
                { name: "created_at", type: "Long", nullable: false, description: "Epoch millis of local creation" },
                { name: "updated_at", type: "Long", nullable: false, description: "Epoch millis of last local update", conflict_policy: "last_writer_wins" },
                { name: "vector_clock_json", type: "String", nullable: true, description: "Serialized VectorClock map" },
                { name: "retry_count", type: "Int", nullable: false, description: "Current retry attempt count", conflict_policy: "local_only" },
                { name: "last_error", type: "String", nullable: true, description: "Last sync error message" },
            ],
            invariants: [
                "status must be a valid PendingReportState enum value",
                "retry_count >= 0",
                "created_at <= updated_at",
                "If status is 'merged', vector_clock_json must not be null",
            ],
            source_architecture_blocks: findBlocksContaining(arch, ["pending report", "local report"]),
            source_interface_blocks: findBlocksContaining(iface, ["pending report", "offline report"]),
            source_module_blocks: findBlocksContaining(mod, ["PendingReportRepository", "pending report"]),
        },
        {
            name: "SyncOperationEntity",
            kind: "room_entity",
            fields: [
                { name: "operation_id", type: "String", nullable: false, primary_key: true, description: "UUID primary key" },
                { name: "report_id", type: "String", nullable: false, indexed: true, description: "Associated pending report" },
                { name: "clinic_id", type: "String", nullable: false, description: "Target clinic" },
                { name: "status", type: "String", nullable: false, indexed: true, description: "SyncOperationState enum value" },
                { name: "created_at", type: "Long", nullable: false, description: "When operation was queued" },
                { name: "started_at", type: "Long", nullable: true, description: "When upload started" },
                { name: "completed_at", type: "Long", nullable: true, description: "When operation completed" },
            ],
            invariants: [
                "status must be a valid SyncOperationState enum value",
                "started_at is null if status is 'queued'",
            ],
            source_architecture_blocks: findBlocksContaining(arch, ["sync queue", "background sync"]),
            source_interface_blocks: findBlocksContaining(iface, ["sync", "upload"]),
            source_module_blocks: findBlocksContaining(mod, ["SyncQueueManager"]),
        },
        {
            name: "RetryLedgerEntry",
            kind: "room_entity",
            fields: [
                { name: "entry_id", type: "String", nullable: false, primary_key: true, description: "UUID primary key" },
                { name: "report_id", type: "String", nullable: false, indexed: true, description: "Associated pending report" },
                { name: "attempt_number", type: "Int", nullable: false, description: "Sequential attempt counter" },
                { name: "timestamp", type: "Long", nullable: false, description: "Epoch millis of attempt" },
                { name: "http_status", type: "Int", nullable: true, description: "HTTP response code or null" },
                { name: "error_code", type: "String", nullable: true, description: "Application error code" },
                { name: "next_retry_at", type: "Long", nullable: true, description: "Scheduled next retry epoch millis" },
            ],
            invariants: [
                "attempt_number >= 1",
                "If http_status is null, error_code should describe network failure",
            ],
            source_architecture_blocks: findBlocksContaining(arch, ["retry", "backoff"]),
            source_interface_blocks: findBlocksContaining(iface, ["retry"]),
            source_module_blocks: findBlocksContaining(mod, ["RetryLedger"]),
        },
        {
            name: "ConflictRecordEntity",
            kind: "room_entity",
            fields: [
                { name: "conflict_id", type: "String", nullable: false, primary_key: true, description: "UUID primary key" },
                { name: "report_id", type: "String", nullable: false, indexed: true, description: "Report with conflict" },
                { name: "conflict_type", type: "String", nullable: false, description: "ConflictType enum value" },
                { name: "local_version_json", type: "String", nullable: false, description: "Serialized local report snapshot" },
                { name: "remote_version_json", type: "String", nullable: false, description: "Serialized remote report snapshot" },
                { name: "conflicting_fields_json", type: "String", nullable: false, description: "JSON array of conflicting field names" },
                { name: "resolution_status", type: "String", nullable: false, description: "ConflictResolutionState enum value" },
                { name: "resolved_by", type: "String", nullable: true, description: "Actor ID who resolved (null if auto)" },
                { name: "resolved_at", type: "Long", nullable: true, description: "Resolution timestamp" },
            ],
            invariants: [
                "If resolution_status is 'clinician_resolved', resolved_by must not be null",
                "conflict_type must be a valid ConflictType enum value",
            ],
            source_architecture_blocks: findBlocksContaining(arch, ["conflict", "vector clock"]),
            source_interface_blocks: findBlocksContaining(iface, ["conflict"]),
            source_module_blocks: findBlocksContaining(mod, ["ConflictResolver"]),
        },
        {
            name: "VectorClockEntry",
            kind: "room_entity",
            fields: [
                { name: "clock_id", type: "String", nullable: false, primary_key: true, description: "Composite key: report_id + actor_id" },
                { name: "report_id", type: "String", nullable: false, indexed: true, description: "Associated report" },
                { name: "actor_id", type: "String", nullable: false, description: "Actor (device/clinician)" },
                { name: "sequence_number", type: "Int", nullable: false, description: "Monotonically increasing counter" },
            ],
            invariants: [
                "sequence_number >= 0",
                "clock_id = report_id + ':' + actor_id",
            ],
            source_architecture_blocks: findBlocksContaining(arch, ["vector clock"]),
            source_interface_blocks: findBlocksContaining(iface, ["vector clock", "version"]),
            source_module_blocks: findBlocksContaining(mod, ["vector clock", "conflict"]),
        },
        {
            name: "AuditEventEntity",
            kind: "room_entity",
            fields: [
                { name: "event_id", type: "String", nullable: false, primary_key: true, description: "UUID primary key" },
                { name: "timestamp", type: "Long", nullable: false, indexed: true, description: "Epoch millis" },
                { name: "actor_id", type: "String", nullable: false, description: "Clinician or system" },
                { name: "action_type", type: "String", nullable: false, indexed: true, description: "triage_created, sync_attempted, conflict_detected, etc." },
                { name: "report_id", type: "String", nullable: true, indexed: true, description: "Associated report if applicable" },
                { name: "payload_checksum", type: "String", nullable: false, description: "SHA-256 of event payload" },
                { name: "details_json", type: "String", nullable: true, description: "Serialized event details" },
            ],
            invariants: [
                "action_type must be one of the defined audit action types",
                "payload_checksum is SHA-256 hex string",
            ],
            source_architecture_blocks: findBlocksContaining(arch, ["audit"]),
            source_interface_blocks: findBlocksContaining(iface, ["audit"]),
            source_module_blocks: findBlocksContaining(mod, ["AuditEventWriter"]),
        },
    ];
}
// ---------------------------------------------------------------------------
// Network DTOs (8)
// ---------------------------------------------------------------------------
function networkDTOs(arch, iface, mod) {
    return [
        {
            name: "OfflineReportEnvelope",
            kind: "network_dto",
            fields: [
                { name: "report_id", type: "String", nullable: false, description: "Report UUID" },
                { name: "clinic_id", type: "String", nullable: false, description: "Target clinic" },
                { name: "patient_case_id", type: "String", nullable: false, description: "Patient case" },
                { name: "triage_result", type: "TriageResult", nullable: false, description: "Decision tree output" },
                { name: "created_at", type: "String (ISO-8601)", nullable: false, description: "Creation timestamp" },
                { name: "device_id", type: "String", nullable: false, description: "Source device" },
                { name: "vector_clock", type: "Map<String, Int>", nullable: false, description: "Current vector clock" },
            ],
            invariants: ["Must be serializable to JSON for HTTP upload"],
            source_architecture_blocks: findBlocksContaining(arch, ["offline report", "pending report"]),
            source_interface_blocks: findBlocksContaining(iface, ["offline report", "upload"]),
            source_module_blocks: findBlocksContaining(mod, ["sync", "upload"]),
        },
        {
            name: "SyncChangePullRequest",
            kind: "network_dto",
            fields: [
                { name: "clinic_id", type: "String", nullable: false, description: "Clinic to pull from" },
                { name: "sync_cursor", type: "String", nullable: true, description: "Last known cursor (null for first pull)" },
                { name: "device_id", type: "String", nullable: false, description: "Requesting device" },
            ],
            invariants: [],
            source_architecture_blocks: findBlocksContaining(arch, ["sync", "pull"]),
            source_interface_blocks: findBlocksContaining(iface, ["sync", "pull"]),
            source_module_blocks: findBlocksContaining(mod, ["ClinicReplicaClient"]),
        },
        {
            name: "SyncChangePullResponse",
            kind: "network_dto",
            fields: [
                { name: "changes", type: "List<RemoteChange>", nullable: false, description: "List of changes since cursor" },
                { name: "new_cursor", type: "String", nullable: false, description: "Updated cursor for next pull" },
                { name: "has_more", type: "Boolean", nullable: false, description: "Whether more changes exist" },
            ],
            invariants: ["new_cursor must be opaque — client must not parse it"],
            source_architecture_blocks: findBlocksContaining(arch, ["sync", "pull"]),
            source_interface_blocks: findBlocksContaining(iface, ["sync", "pull", "cursor"]),
            source_module_blocks: findBlocksContaining(mod, ["ClinicReplicaClient"]),
        },
        {
            name: "SyncUploadRequest",
            kind: "network_dto",
            fields: [
                { name: "report", type: "OfflineReportEnvelope", nullable: false, description: "Report to upload" },
                { name: "expected_server_clock", type: "Map<String, Int>", nullable: true, description: "Client's last known server clock (for conflict detection)" },
            ],
            invariants: [],
            source_architecture_blocks: findBlocksContaining(arch, ["sync", "upload"]),
            source_interface_blocks: findBlocksContaining(iface, ["sync", "upload"]),
            source_module_blocks: findBlocksContaining(mod, ["SyncQueueManager"]),
        },
        {
            name: "SyncUploadResult",
            kind: "network_dto",
            fields: [
                { name: "status", type: "String", nullable: false, description: "'accepted' | 'conflict' | 'rejected'" },
                { name: "server_clock", type: "Map<String, Int>", nullable: false, description: "Server's updated vector clock" },
                { name: "conflict_payload", type: "ConflictPayload", nullable: true, description: "Present only if status='conflict'" },
            ],
            invariants: ["If status='conflict', conflict_payload must not be null"],
            source_architecture_blocks: findBlocksContaining(arch, ["sync", "conflict"]),
            source_interface_blocks: findBlocksContaining(iface, ["sync", "upload", "conflict"]),
            source_module_blocks: findBlocksContaining(mod, ["SyncQueueManager", "ConflictResolver"]),
        },
        {
            name: "SyncAckRequest",
            kind: "network_dto",
            fields: [
                { name: "report_id", type: "String", nullable: false, description: "Report being acknowledged" },
                { name: "client_clock", type: "Map<String, Int>", nullable: false, description: "Client's current clock after merge" },
            ],
            invariants: [],
            source_architecture_blocks: findBlocksContaining(arch, ["sync", "acknowledge"]),
            source_interface_blocks: findBlocksContaining(iface, ["sync", "ack"]),
            source_module_blocks: findBlocksContaining(mod, ["SyncQueueManager"]),
        },
        {
            name: "ConflictPayload",
            kind: "network_dto",
            fields: [
                { name: "report_id", type: "String", nullable: false, description: "Report with conflict" },
                { name: "local_version", type: "ReportSnapshot", nullable: false, description: "Client's version" },
                { name: "remote_version", type: "ReportSnapshot", nullable: false, description: "Server's version" },
                { name: "local_clock", type: "Map<String, Int>", nullable: false, description: "Client's vector clock" },
                { name: "remote_clock", type: "Map<String, Int>", nullable: false, description: "Server's vector clock" },
                { name: "conflicting_fields", type: "List<String>", nullable: false, description: "Fields with divergent values" },
            ],
            invariants: ["conflicting_fields must not be empty"],
            source_architecture_blocks: findBlocksContaining(arch, ["conflict payload", "both versions"]),
            source_interface_blocks: findBlocksContaining(iface, ["conflict", "payload"]),
            source_module_blocks: findBlocksContaining(mod, ["ConflictResolver"]),
        },
        {
            name: "VersionMetadata",
            kind: "network_dto",
            fields: [
                { name: "vector_clock", type: "Map<String, Int>", nullable: false, description: "Causal version vector" },
                { name: "last_modified_by", type: "String", nullable: false, description: "Actor who last modified" },
                { name: "last_modified_at", type: "String (ISO-8601)", nullable: false, description: "Last modification timestamp" },
                { name: "schema_version", type: "String", nullable: false, description: "Data schema version" },
            ],
            invariants: ["Included in every sync request/response for version tracking"],
            source_architecture_blocks: findBlocksContaining(arch, ["vector clock", "version"]),
            source_interface_blocks: findBlocksContaining(iface, ["version", "metadata"]),
            source_module_blocks: findBlocksContaining(mod, ["vector clock", "version"]),
        },
    ];
}
export function projectDataModels(architecture, interfaceSpec, moduleSpec) {
    const rooms = roomEntities(architecture, interfaceSpec, moduleSpec);
    const dtos = networkDTOs(architecture, interfaceSpec, moduleSpec);
    const models = [...rooms, ...dtos];
    // Check for unknown types
    const knownTypes = new Set([
        "String", "Int", "Long", "Boolean", "Float", "Double",
        "String (UUID)", "String (ISO-8601)",
        "Map<String, Int>", "List<String>",
        "TriageResult", "ReportSnapshot", "OfflineReportEnvelope",
        "ConflictPayload", "RemoteChange", "List<RemoteChange>",
        "VectorClock",
    ]);
    const unknownTypes = [];
    for (const m of models) {
        for (const f of m.fields) {
            if (!knownTypes.has(f.type)) {
                unknownTypes.push(`${m.name}.${f.name}: ${f.type}`);
            }
        }
    }
    return {
        models,
        room_entity_count: rooms.length,
        network_dto_count: dtos.length,
        value_object_count: 0,
        unknown_field_types: unknownTypes,
    };
}
//# sourceMappingURL=dataModelProjector.js.map