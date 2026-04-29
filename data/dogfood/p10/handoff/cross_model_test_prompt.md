# Implementation Task: Pet Triage Offline-First Data Model Slice

You are a Kotlin/Android engineer. You have been given a **complete implementation handoff package** for an offline-first pet triage system. Your task is to implement a **data-model slice** based ONLY on the information below.

## CRITICAL RULES

1. **Do NOT invent fields** not present in the handoff package.
2. **Do NOT invent states** outside the state machines defined below.
3. **Do NOT use LWW (Last-Writer-Wins)** for clinical fields unless the conflict policy matrix explicitly permits it.
4. **Do NOT omit VectorClock metadata** for clinical conflict-sensitive fields.
5. **Do NOT ignore audit_required flags** from the conflict policy matrix.
6. **Do NOT assume a single clinic** — the system supports multiple independent clinic backends.
7. **Do NOT skip ConflictPayload required fields**.
8. **Do NOT add ML/AI-based triage** — the decision tree is deterministic.

## REQUIRED OUTPUTS

Implement the following in Kotlin:

### 1. Room Entities
- `PendingReportEntity` (with @Entity, @PrimaryKey, @ColumnInfo)
- `SyncOperationEntity`
- `ConflictRecordEntity`
- `VectorClockEntry`
- `AuditEventEntity`
- `RetryLedgerEntry`

### 2. DTOs
- `ConflictPayload`
- `VectorClock` (as data class)
- `OfflineReportEnvelope`
- `SyncUploadResult`

### 3. Enums
- `PendingReportState`
- `SyncOperationState`
- `ConflictResolutionState`
- `ConflictPolicy` (enum of policies used)

### 4. Unit Tests
- Clinical fields require vector_clock policy
- LWW only allowed for configured low-risk metadata
- `retry_attempt_count` is local_only
- `sync_cursor` is server_token
- Forbidden state transitions rejected
- ConflictPayload required fields validated

## HANDOFF PACKAGE (NORMATIVE)

The following is your ONLY source of truth. Do not deviate.

---

# Implementation Handoff: Pet Triage Offline-First Migration

**Package ID**: `handoff_1777189536304`
**Created**: 2026-04-26T07:45:36.304Z
**Platform**: android
**Stack**: Kotlin, Jetpack Compose, Room, WorkManager, OkHttp/Retrofit

---

## Normative vs Advisory

### What Is Normative (must not deviate)
- All **contract definitions** (terms, kinds, fields, enum values)
- All **conflict policy matrix** entries (field → policy mapping)
- All **state machine** definitions (states, transitions, forbidden transitions)
- All **forbidden assumptions**
- All **data model** field definitions and invariants

### What Is Advisory (guidance, not law)
- Implementation task descriptions and suggested test names
- Risk note descriptions
- Non-goal explanations

### Open Gaps
- 9 unknown structural terms found (not in mandatory list)

---

## 1. Source Artifacts

| Artifact | Type | Revision |
|---|---|---|
| `pet_triage_offline_architecture` | ArchitectureDraft | `rev_d252eb5b2bc6` |
| `pet_triage_offline_interface` | InterfaceSpec | `rev_a1695505f72c` |
| `pet_triage_offline_module` | ModuleSpec | `rev_17695c778e19` |

---

## 2. Implementation Scope

**Target**: android
**Stack**: Kotlin, Jetpack Compose, Room, WorkManager, OkHttp/Retrofit

### Included Components
- OfflineDecisionTreeRunner
- PendingReportRepository
- SyncQueueManager
- RetryLedger
- ConflictResolver
- ClinicReplicaClient
- AuditEventWriter
- ConnectivityObserver
- UserConflictReviewPresenter

### Excluded
- Backend server implementation
- iOS client
- Web admin dashboard
- ML-based triage

### Non-Goals
- Real-time collaborative editing
- P2P sync between devices
- Full CRDT implementation
- Backend migration

---

## 3. Contract Definitions

17/17 mandatory terms defined.

### `pending_report` (schema)

A locally-created triage report that has not yet been confirmed by the backend. Persisted in Room, survives app restart.

| Field | Type | Required | Description |
|---|---|---|---|
| `report_id` | String (UUID) | yes | Unique identifier for the report |
| `clinic_id` | String | yes | Target clinic backend identifier |
| `patient_case_id` | String | yes | Associated patient case |
| `triage_result` | TriageResult | yes | Output from OfflineDecisionTreeRunner |
| `status` | PendingReportState | yes | Current lifecycle state |
| `created_at` | Instant | yes | Local creation timestamp |
| `vector_clock` | Map<String, Int> | no | Causal version vector |
| `retry_count` | Int | yes | Number of sync attempts |

### `pending_report_state` (enum)

Lifecycle states of a pending report from local creation through sync and conflict resolution.

| Value | Description |
|---|---|
| `draft` | Report being composed locally |
| `completed_offline` | Triage completed, awaiting queue |
| `queued_for_sync` | In sync queue, waiting for connectivity |
| `syncing` | Currently being uploaded to clinic backend |
| `merged` | Successfully merged with backend state |
| `conflicted` | Vector clock conflict detected, needs resolution |
| `requires_review` | Conflict requires clinician manual review |
| `failed_retryable` | Sync failed, will retry with backoff |
| `failed_terminal` | Max retries exceeded, requires manual intervention |

### `sync_queue` (module)

FIFO queue managed by SyncQueueManager. Processes pending reports in order, triggered by ConnectivityObserver.

### `retry_ledger` (schema)

Per-report log of sync attempts. Records timestamp, HTTP status, error code, retry count. Drives exponential backoff.

| Field | Type | Required | Description |
|---|---|---|---|
| `ledger_entry_id` | String (UUID) | yes | Unique entry identifier |
| `report_id` | String | yes | Associated pending report |
| `attempt_number` | Int | yes | Sequential attempt counter |
| `timestamp` | Instant | yes | When this attempt occurred |
| `http_status` | Int? | no | HTTP response status or null if network error |
| `error_code` | String? | no | Application-level error code |
| `next_retry_at` | Instant? | no | Scheduled next retry (exponential backoff) |

### `sync_cursor` (field)

Server-issued opaque token representing the last-known sync position. Used in GET /sync/pull to request only new changes.

### `clinic_replica_id` (identifier)

Unique identifier for a clinic backend instance. Each clinic has independent state and sync endpoint.

### `device_id` (identifier)

Unique identifier for the Android device. Used as an actor in vector clock entries.

### `actor_id` (identifier)

Identity of the user performing an action (clinician ID). Recorded in audit events and vector clock entries.

### `vector_clock` (schema)

Map<ActorId, SequenceNumber> tracking causal history of edits. Used to detect concurrent modifications on clinical fields.

| Field | Type | Required | Description |
|---|---|---|---|
| `entries` | Map<String, Int> | yes | Actor ID to sequence number mapping |

### `lww_policy` (policy)

Conflict resolution policy for non-clinical metadata fields. Latest timestamp wins. Only permitted on fields classified as non-clinical.

### `conflict_payload` (schema)

Server response when a sync upload detects a vector clock conflict. Contains local version, remote version, and conflict metadata.

| Field | Type | Required | Description |
|---|---|---|---|
| `report_id` | String | yes | Report with conflict |
| `local_version` | ReportSnapshot | yes | Client's version of the report |
| `remote_version` | ReportSnapshot | yes | Server's version of the report |
| `local_clock` | VectorClock | yes | Client's vector clock |
| `remote_clock` | VectorClock | yes | Server's vector clock |
| `conflicting_fields` | List<String> | yes | Field names with divergent values |

### `conflict_type` (enum)

Classification of detected conflicts.

| Value | Description |
|---|---|
| `vector_clock_divergence` | Concurrent edits detected via vector clock |
| `lww_overwrite` | LWW applied to metadata field (informational) |
| `schema_version_mismatch` | Client and server schema versions differ |

### `resolution_policy` (enum)

How a specific conflict should be resolved.

| Value | Description |
|---|---|
| `auto_merge` | Non-overlapping changes merged automatically |
| `lww_applied` | Last-writer-wins applied (metadata only) |
| `clinician_review` | Conflict requires explicit clinician selection |

### `user_visible_conflict_state` (state)

UI state where the clinician sees both versions of a conflicted report and must explicitly select a resolution for each conflicting field.

### `audit_event` (schema)

Immutable record of a system action. Includes timestamp, actor, action type, report ID, and payload checksum.

| Field | Type | Required | Description |
|---|---|---|---|
| `event_id` | String (UUID) | yes | Unique event identifier |
| `timestamp` | Instant | yes | When the event occurred |
| `actor_id` | String | yes | Clinician or system actor |
| `action_type` | String | yes | Type of action (e.g. triage_created, sync_attempted) |
| `report_id` | String? | no | Associated report, if applicable |
| `payload_checksum` | String | yes | SHA-256 of the event payload |

### `offline_decision_tree` (module)

Deterministic rule interpreter (no ML) that evaluates species, symptoms, and urgency to produce a triage result. Rules are versioned and refreshed on connectivity restore.

### `sync_status` (state)

Current state of a sync operation, represented by SyncOperationState enum. Tracks progress from queued through in_flight to acknowledged, conflict_detected, or dead_lettered.

---

## 4. Conflict Policy Matrix

| Field Group | Policy | Risk | Audit | User Visible |
|---|---|---|---|---|
| patient_case_status | `vector_clock` | high | yes | yes |
| vet_note_summary | `vector_clock` | high | yes | yes |
| triage_report_body | `vector_clock` | high | yes | yes |
| risk_level | `vector_clock` | high | yes | yes |
| suspected_condition | `vector_clock` | high | yes | yes |
| pending_report_state | `vector_clock` | medium | yes | yes |
| sync_cursor | `server_token` | low | no | no |
| retry_attempt_count | `local_only` | low | no | no |
| last_viewed_screen | `last_writer_wins` | low | no | no |
| local_cache_timestamp | `last_writer_wins` | low | no | no |
| clinic_replica_id | `server_token` | low | no | no |
| device_id | `local_only` | low | no | no |
| actor_id | `local_only` | low | no | no |

---

## 5. Data Models

6 Room entities, 8 Network DTOs

### PendingReportEntity (room_entity)

| Field | Type | Nullable | PK | Indexed | Conflict Policy | Description |
|---|---|---|---|---|---|---|
| `report_id` | String | no | yes |  |  | UUID primary key |
| `clinic_id` | String | no |  | yes |  | Target clinic backend |
| `patient_case_id` | String | no |  | yes |  | Associated patient case |
| `triage_result_json` | String | no |  |  |  | Serialized TriageResult from decision tree |
| `status` | String | no |  | yes | vector_clock | PendingReportState enum value |
| `created_at` | Long | no |  |  |  | Epoch millis of local creation |
| `updated_at` | Long | no |  |  | last_writer_wins | Epoch millis of last local update |
| `vector_clock_json` | String | yes |  |  |  | Serialized VectorClock map |
| `retry_count` | Int | no |  |  | local_only | Current retry attempt count |
| `last_error` | String | yes |  |  |  | Last sync error message |

**Invariants:**
- status must be a valid PendingReportState enum value
- retry_count >= 0
- created_at <= updated_at
- If status is 'merged', vector_clock_json must not be null

### SyncOperationEntity (room_entity)

| Field | Type | Nullable | PK | Indexed | Conflict Policy | Description |
|---|---|---|---|---|---|---|
| `operation_id` | String | no | yes |  |  | UUID primary key |
| `report_id` | String | no |  | yes |  | Associated pending report |
| `clinic_id` | String | no |  |  |  | Target clinic |
| `status` | String | no |  | yes |  | SyncOperationState enum value |
| `created_at` | Long | no |  |  |  | When operation was queued |
| `started_at` | Long | yes |  |  |  | When upload started |
| `completed_at` | Long | yes |  |  |  | When operation completed |

**Invariants:**
- status must be a valid SyncOperationState enum value
- started_at is null if status is 'queued'

### RetryLedgerEntry (room_entity)

| Field | Type | Nullable | PK | Indexed | Conflict Policy | Description |
|---|---|---|---|---|---|---|
| `entry_id` | String | no | yes |  |  | UUID primary key |
| `report_id` | String | no |  | yes |  | Associated pending report |
| `attempt_number` | Int | no |  |  |  | Sequential attempt counter |
| `timestamp` | Long | no |  |  |  | Epoch millis of attempt |
| `http_status` | Int | yes |  |  |  | HTTP response code or null |
| `error_code` | String | yes |  |  |  | Application error code |
| `next_retry_at` | Long | yes |  |  |  | Scheduled next retry epoch millis |

**Invariants:**
- attempt_number >= 1
- If http_status is null, error_code should describe network failure

### ConflictRecordEntity (room_entity)

| Field | Type | Nullable | PK | Indexed | Conflict Policy | Description |
|---|---|---|---|---|---|---|
| `conflict_id` | String | no | yes |  |  | UUID primary key |
| `report_id` | String | no |  | yes |  | Report with conflict |
| `conflict_type` | String | no |  |  |  | ConflictType enum value |
| `local_version_json` | String | no |  |  |  | Serialized local report snapshot |
| `remote_version_json` | String | no |  |  |  | Serialized remote report snapshot |
| `conflicting_fields_json` | String | no |  |  |  | JSON array of conflicting field names |
| `resolution_status` | String | no |  |  |  | ConflictResolutionState enum value |
| `resolved_by` | String | yes |  |  |  | Actor ID who resolved (null if auto) |
| `resolved_at` | Long | yes |  |  |  | Resolution timestamp |

**Invariants:**
- If resolution_status is 'clinician_resolved', resolved_by must not be null
- conflict_type must be a valid ConflictType enum value

### VectorClockEntry (room_entity)

| Field | Type | Nullable | PK | Indexed | Conflict Policy | Description |
|---|---|---|---|---|---|---|
| `clock_id` | String | no | yes |  |  | Composite key: report_id + actor_id |
| `report_id` | String | no |  | yes |  | Associated report |
| `actor_id` | String | no |  |  |  | Actor (device/clinician) |
| `sequence_number` | Int | no |  |  |  | Monotonically increasing counter |

**Invariants:**
- sequence_number >= 0
- clock_id = report_id + ':' + actor_id

### AuditEventEntity (room_entity)

| Field | Type | Nullable | PK | Indexed | Conflict Policy | Description |
|---|---|---|---|---|---|---|
| `event_id` | String | no | yes |  |  | UUID primary key |
| `timestamp` | Long | no |  | yes |  | Epoch millis |
| `actor_id` | String | no |  |  |  | Clinician or system |
| `action_type` | String | no |  | yes |  | triage_created, sync_attempted, conflict_detected, etc. |
| `report_id` | String | yes |  | yes |  | Associated report if applicable |
| `payload_checksum` | String | no |  |  |  | SHA-256 of event payload |
| `details_json` | String | yes |  |  |  | Serialized event details |

**Invariants:**
- action_type must be one of the defined audit action types
- payload_checksum is SHA-256 hex string

### OfflineReportEnvelope (network_dto)

| Field | Type | Nullable | PK | Indexed | Conflict Policy | Description |
|---|---|---|---|---|---|---|
| `report_id` | String | no |  |  |  | Report UUID |
| `clinic_id` | String | no |  |  |  | Target clinic |
| `patient_case_id` | String | no |  |  |  | Patient case |
| `triage_result` | TriageResult | no |  |  |  | Decision tree output |
| `created_at` | String (ISO-8601) | no |  |  |  | Creation timestamp |
| `device_id` | String | no |  |  |  | Source device |
| `vector_clock` | Map<String, Int> | no |  |  |  | Current vector clock |

**Invariants:**
- Must be serializable to JSON for HTTP upload

### SyncChangePullRequest (network_dto)

| Field | Type | Nullable | PK | Indexed | Conflict Policy | Description |
|---|---|---|---|---|---|---|
| `clinic_id` | String | no |  |  |  | Clinic to pull from |
| `sync_cursor` | String | yes |  |  |  | Last known cursor (null for first pull) |
| `device_id` | String | no |  |  |  | Requesting device |

### SyncChangePullResponse (network_dto)

| Field | Type | Nullable | PK | Indexed | Conflict Policy | Description |
|---|---|---|---|---|---|---|
| `changes` | List<RemoteChange> | no |  |  |  | List of changes since cursor |
| `new_cursor` | String | no |  |  |  | Updated cursor for next pull |
| `has_more` | Boolean | no |  |  |  | Whether more changes exist |

**Invariants:**
- new_cursor must be opaque — client must not parse it

### SyncUploadRequest (network_dto)

| Field | Type | Nullable | PK | Indexed | Conflict Policy | Description |
|---|---|---|---|---|---|---|
| `report` | OfflineReportEnvelope | no |  |  |  | Report to upload |
| `expected_server_clock` | Map<String, Int> | yes |  |  |  | Client's last known server clock (for conflict detection) |

### SyncUploadResult (network_dto)

| Field | Type | Nullable | PK | Indexed | Conflict Policy | Description |
|---|---|---|---|---|---|---|
| `status` | String | no |  |  |  | 'accepted' | 'conflict' | 'rejected' |
| `server_clock` | Map<String, Int> | no |  |  |  | Server's updated vector clock |
| `conflict_payload` | ConflictPayload | yes |  |  |  | Present only if status='conflict' |

**Invariants:**
- If status='conflict', conflict_payload must not be null

### SyncAckRequest (network_dto)

| Field | Type | Nullable | PK | Indexed | Conflict Policy | Description |
|---|---|---|---|---|---|---|
| `report_id` | String | no |  |  |  | Report being acknowledged |
| `client_clock` | Map<String, Int> | no |  |  |  | Client's current clock after merge |

### ConflictPayload (network_dto)

| Field | Type | Nullable | PK | Indexed | Conflict Policy | Description |
|---|---|---|---|---|---|---|
| `report_id` | String | no |  |  |  | Report with conflict |
| `local_version` | ReportSnapshot | no |  |  |  | Client's version |
| `remote_version` | ReportSnapshot | no |  |  |  | Server's version |
| `local_clock` | Map<String, Int> | no |  |  |  | Client's vector clock |
| `remote_clock` | Map<String, Int> | no |  |  |  | Server's vector clock |
| `conflicting_fields` | List<String> | no |  |  |  | Fields with divergent values |

**Invariants:**
- conflicting_fields must not be empty

### VersionMetadata (network_dto)

| Field | Type | Nullable | PK | Indexed | Conflict Policy | Description |
|---|---|---|---|---|---|---|
| `vector_clock` | Map<String, Int> | no |  |  |  | Causal version vector |
| `last_modified_by` | String | no |  |  |  | Actor who last modified |
| `last_modified_at` | String (ISO-8601) | no |  |  |  | Last modification timestamp |
| `schema_version` | String | no |  |  |  | Data schema version |

**Invariants:**
- Included in every sync request/response for version tracking

---

## 6. State Machines

### PendingReportState

**States**: `draft`, `completed_offline`, `queued_for_sync`, `syncing`, `merged`, `conflicted`, `requires_review`, `failed_retryable`, `failed_terminal`

#### Allowed Transitions

| From | To | Trigger | Audit Required |
|---|---|---|---|
| `draft` | `completed_offline` | triage_completed | yes |
| `completed_offline` | `queued_for_sync` | enqueue_for_sync | no |
| `queued_for_sync` | `syncing` | sync_started | no |
| `syncing` | `merged` | sync_accepted | yes |
| `syncing` | `conflicted` | conflict_detected | yes |
| `syncing` | `failed_retryable` | sync_failed_transient | no |
| `failed_retryable` | `queued_for_sync` | retry_scheduled | no |
| `failed_retryable` | `failed_terminal` | max_retries_exceeded | yes |
| `conflicted` | `requires_review` | clinician_review_required | yes |
| `requires_review` | `merged` | clinician_resolved | yes |
| `conflicted` | `merged` | auto_merge_succeeded | yes |

#### Forbidden Transitions

| From | To | Reason |
|---|---|---|
| `conflicted` | `queued_for_sync` | Cannot bypass conflict resolution by re-queueing; must resolve or escalate to review first |
| `failed_terminal` | `syncing` | Terminal failure requires manual intervention, not automatic retry |
| `requires_review` | `queued_for_sync` | Cannot skip clinician review by re-queueing |
| `merged` | `draft` | Merged reports cannot revert to draft |
| `merged` | `queued_for_sync` | Already merged; re-sync not permitted |

### SyncOperationState

**States**: `queued`, `in_flight`, `acknowledged`, `retry_scheduled`, `conflict_detected`, `dead_lettered`

#### Allowed Transitions

| From | To | Trigger | Audit Required |
|---|---|---|---|
| `queued` | `in_flight` | upload_started | no |
| `in_flight` | `acknowledged` | server_ack_received | yes |
| `in_flight` | `conflict_detected` | conflict_response | yes |
| `in_flight` | `retry_scheduled` | transient_failure | no |
| `retry_scheduled` | `queued` | retry_timer_expired | no |
| `retry_scheduled` | `dead_lettered` | max_retries_exceeded | yes |
| `conflict_detected` | `queued` | conflict_resolved_requeue | yes |

#### Forbidden Transitions

| From | To | Reason |
|---|---|---|
| `dead_lettered` | `queued` | Dead-lettered operations require manual intervention |
| `acknowledged` | `in_flight` | Acknowledged operations are terminal |
| `dead_lettered` | `in_flight` | Cannot retry dead-lettered operations automatically |

### ConflictResolutionState

**States**: `auto_merged`, `lww_applied`, `vector_conflict`, `manual_review_required`, `clinician_resolved`

#### Allowed Transitions

| From | To | Trigger | Audit Required |
|---|---|---|---|
| `vector_conflict` | `auto_merged` | non_overlapping_fields_merged | yes |
| `vector_conflict` | `manual_review_required` | overlapping_clinical_fields | yes |
| `vector_conflict` | `lww_applied` | metadata_only_conflict | yes |
| `manual_review_required` | `clinician_resolved` | clinician_selected_version | yes |

#### Forbidden Transitions

| From | To | Reason |
|---|---|---|
| `manual_review_required` | `auto_merged` | Clinical conflicts cannot be auto-merged; clinician must review |
| `clinician_resolved` | `manual_review_required` | Resolution is final; cannot revert to review |
| `lww_applied` | `manual_review_required` | LWW resolution is final for metadata |

---

## 7. Implementation Tasks

### TASK-001: Define offline triage data models

**Module**: data

Create Room entity classes for PendingReportEntity, SyncOperationEntity, RetryLedgerEntry, ConflictRecordEntity, VectorClockEntry, and AuditEventEntity. Create network DTO classes for OfflineReportEnvelope, SyncChangePullRequest/Response, SyncUploadRequest/Result, SyncAckRequest, ConflictPayload, and VersionMetadata. Define all enums: PendingReportState, SyncOperationState, ConflictResolutionState, ConflictType.

**Acceptance Criteria:**
- All 6 Room entities compile and have @Entity annotation
- All 8 network DTOs are serializable to JSON
- All enum values match the state machine definitions exactly
- Primary keys and indexes match DataModelSpec
- No field uses an undefined type

**Required Tests:**
- Room entity insert/query round-trip test
- DTO JSON serialization/deserialization test
- Enum exhaustiveness test (all values covered in when/switch)

### TASK-002: Implement PendingReportRepository

**Module**: persistence

Implement the PendingReportRepository using Room DAO. Must support: insert new report, update status, query by status, query all pending for sync, delete merged reports (optional cleanup). All operations must be suspend functions for coroutine compatibility.

**Acceptance Criteria:**
- Insert creates report with status 'draft' and retry_count=0
- Update status transitions are validated against PendingReportState machine
- Query by status returns correct subset
- Reports survive process kill (Room persistence verified)
- No blocking operations on main thread

**Required Tests:**
- Insert and retrieve by ID
- Status transition: draft → completed_offline → queued_for_sync
- Query all reports with status 'queued_for_sync'
- Reject invalid transition: merged → draft

### TASK-003: Implement OfflineDecisionTreeRunner

**Module**: triage

Implement the deterministic rule interpreter for offline triage. Takes species, symptoms, and urgency as input. Produces a TriageResult. Rules are versioned and loaded from bundled assets, refreshed from backend on connectivity restore. No machine learning — pure rule evaluation.

**Acceptance Criteria:**
- Same input always produces same output (deterministic)
- Rule version is tracked and available for display
- Rules can be refreshed from network without app restart
- Triage result includes confidence and reasoning chain
- No network call required during triage execution

**Required Tests:**
- Determinism test: same input → same output across runs
- Rule version tracking test
- Multiple species/symptom combinations test
- Edge case: empty symptoms list

### TASK-004: Implement SyncQueueManager and RetryLedger

**Module**: sync

Implement the FIFO sync queue using WorkManager or equivalent background scheduler. Process pending reports in order. Record each attempt in RetryLedger. Implement exponential backoff. Trigger sync on connectivity restore via ConnectivityObserver. All network operations on background coroutine.

**Acceptance Criteria:**
- Reports are processed in FIFO order
- Each sync attempt creates a RetryLedgerEntry
- Exponential backoff doubles delay on each failure
- Max retries exceeded → status transitions to failed_terminal
- UI thread is never blocked by sync operations
- Sync triggers automatically on connectivity restore

**Required Tests:**
- FIFO ordering test with 3+ queued reports
- Retry ledger records attempt details
- Backoff delay calculation test
- Max retries → terminal failure transition
- ConnectivityObserver triggers re-sync

### TASK-005: Implement ConflictResolver with hybrid policy

**Module**: conflict

Implement the hybrid conflict resolution engine. Vector clock comparison for clinical fields. LWW for metadata fields. Auto-merge for non-overlapping changes. Escalate overlapping clinical conflicts to clinician review. Store ConflictRecordEntity locally. Never auto-resolve clinical field conflicts.

**Acceptance Criteria:**
- Clinical field conflicts always require clinician review
- Metadata-only conflicts resolve via LWW automatically
- Non-overlapping changes auto-merge correctly
- ConflictRecordEntity persisted with both versions
- Audit event generated for every conflict detection and resolution
- Field classification matches conflict_policy_matrix exactly

**Required Tests:**
- Clinical field conflict → requires_review
- Metadata-only conflict → lww_applied
- Non-overlapping fields → auto_merged
- Mixed clinical + metadata → clinical part requires review
- Audit event generation test
- ConflictPayload storage test

### TASK-006: Implement ClinicReplicaClient DTOs and network layer

**Module**: network

Implement the multi-clinic network client. Maintain clinic registry with base URLs and auth tokens. Support POST /sync/upload, GET /sync/pull, POST /sync/ack, POST /sync/resolve. Route requests to correct clinic backend based on clinic_id. Validate registry before use.

**Acceptance Criteria:**
- Requests routed to correct clinic based on clinic_id
- Auth tokens included in all requests
- Registry validation rejects stale/missing entries
- All 4 endpoints implemented (upload, pull, ack, resolve)
- Network errors return structured error codes

**Required Tests:**
- Routing test: different clinic_ids → different base URLs
- Auth token inclusion test
- Stale registry rejection test
- Network error handling test

### TASK-007: Implement AuditEventWriter

**Module**: audit

Implement the audit event writer. Generate immutable audit events for: triage creation, sync attempt, sync success, sync failure, conflict detection, conflict resolution, clinician review. Each event includes timestamp, actor_id, action_type, report_id, and SHA-256 payload checksum.

**Acceptance Criteria:**
- All 7 action types generate correct events
- Events are immutable (no update/delete operations)
- Payload checksum is SHA-256
- Events persist in Room database
- actor_id is always populated (clinician or 'system')

**Required Tests:**
- Event generation for each action type
- Checksum consistency test
- Immutability test: no update method exposed
- Query by action_type and report_id

### TASK-008: Add state-machine and conflict-resolution unit tests

**Module**: test

Comprehensive unit test suite covering all 3 state machines and the conflict resolver. Verify all allowed transitions, all forbidden transitions, audit event requirements, and edge cases. Include property-based tests for vector clock merge.

**Acceptance Criteria:**
- Every allowed transition tested
- Every forbidden transition tested (must throw/reject)
- Audit event requirement verified for flagged transitions
- Vector clock merge produces correct result
- No orphan states (every state reachable)

**Required Tests:**
- PendingReportState: all 11 transitions
- PendingReportState: all 5 forbidden transitions
- SyncOperationState: all 7 transitions
- SyncOperationState: all 3 forbidden transitions
- ConflictResolutionState: all 4 transitions
- ConflictResolutionState: all 3 forbidden transitions
- Vector clock merge: concurrent edits test
- Vector clock merge: causally ordered test

### TASK-009: Implement UserConflictReviewPresenter

**Module**: ui

Implement the conflict review UI screen. Display both local and remote versions side-by-side with field-level diff highlighting. Require clinician to explicitly select a version for each conflicting field. Submit resolution via POST /sync/resolve. Generate audit event on resolution.

**Acceptance Criteria:**
- Both versions displayed with clear diff highlighting
- Each conflicting field requires explicit selection
- Cannot submit without resolving all fields
- Resolution generates audit event with clinician actor_id
- POST /sync/resolve called with updated vector clock

**Required Tests:**
- UI displays both versions correctly
- Submit blocked until all fields resolved
- Resolution generates correct audit event
- Vector clock updated after resolution

### TASK-010: Implement ConnectivityObserver and auto-sync trigger

**Module**: infrastructure

Monitor network connectivity using Android ConnectivityManager. Notify SyncQueueManager when connectivity restores. Debounce rapid connectivity changes. Do not trigger sync if queue is empty.

**Acceptance Criteria:**
- Connectivity change detected within 1 second
- SyncQueueManager notified on restore
- Rapid on/off changes debounced
- No sync triggered if queue is empty
- Works with both WiFi and cellular

**Required Tests:**
- Connectivity restore triggers sync
- Debounce test: rapid changes
- Empty queue: no sync triggered

---

## 8. Forbidden Assumptions

### FA-001

**Do not use LWW for clinical case status, veterinary notes, triage results, risk levels, or suspected conditions unless the field is explicitly listed in the conflict_policy_matrix with policy=last_writer_wins AND a high-risk acceptance exists in the RiskRegister.**

Reason: Clinical data requires causal ordering via vector clocks to prevent silent data loss from concurrent edits by different clinicians or devices.

### FA-002

**Do not silently overwrite remote veterinary edits when syncing local pending reports.**

Reason: A remote vet may have updated case notes during the offline period. Silent overwrite could discard critical clinical observations.

### FA-003

**Do not require users to re-enter completed offline triage data after network restore or app restart.**

Reason: Offline triage results are persisted in Room and survive process kill. Forcing re-entry causes data loss and wastes clinician time.

### FA-004

**Do not treat network failure as terminal for completed offline reports. Failed syncs must remain in the retry queue.**

Reason: Offline-first architecture guarantees that completed reports are never lost due to network conditions. The retry ledger handles backoff and eventual delivery.

### FA-005

**Do not invent new sync states or report lifecycle states outside the defined state machines (PendingReportState, SyncOperationState, ConflictResolutionState).**

Reason: Undocumented states break the deterministic state machine contracts, make conflict resolution unpredictable, and prevent audit trail completeness.

### FA-006

**Do not omit audit events for conflict resolution transitions. Every conflict detection, clinician review, and resolution action must generate an audit event.**

Reason: Audit trail is required for clinical compliance and post-incident review. Missing audit events make conflict history non-reconstructable.

### FA-007

**Do not parse the sync_cursor. It is an opaque server-issued token. Client must store and return it as-is.**

Reason: Cursor format is server-internal. Parsing it creates a coupling that breaks on server-side cursor format changes.

### FA-008

**Do not auto-resolve conflicts on overlapping clinical fields. If both local and remote versions modified the same clinical field, the conflict must be escalated to clinician review.**

Reason: Only a clinician can determine which version of a clinical observation is correct. Automated resolution risks patient safety.

---

## 9. Risk Notes

| Risk | Severity | Mitigation |
|---|---|---|
| LWW is scoped to metadata-only fields (timestamps, read markers). Clinical data ... | high | Field classification must be enforced by schema validator at sync boundary. Add ... |
| Vector clock merge is necessary for correct multi-clinic clinical data handling.... | medium | Provide deterministic merge test fixtures. Document merge semantics for support ... |
| Offline decision tree is versioned and updated on connectivity restore. Risk: st... | medium | Display rule version age indicator in UI. Alert if rules are > 7 days old.... |
| Retry queue uses exponential backoff with terminal failure after max attempts. P... | medium | Expose queue depth metric. Alert if > 50 pending reports. Manual drain endpoint ... |
| 73 local lint residuals are tool-classification gaps (undefined_term, domain_irr... | low | Extend linter dictionary with pet-triage domain terms. Schedule lint cleanup pas... |

---

## 10. Structural Term Closure

Unknown structural terms are not automatically treated as failures.
A term is blocking only if it remains unresolved after checking:
- contract definitions
- data model fields
- state machines
- conflict policy matrix
- implementation tasks

**Total unknown**: 9
**Resolved**: 9
**Unresolved**: 0

### Resolved Terms

| Term | Resolved By | Reason |
|---|---|---|
| `audit_event_writer` | implementation_task | Referenced in task 'TASK-007: Implement AuditEventWriter' (weak resolution — module/component term) |
| `clinic_id` | data_model_field | Field 'clinic_id' in PendingReportEntity (type: String) |
| `clinic_replica_client` | implementation_task | Referenced in task 'TASK-006: Implement ClinicReplicaClient DTOs and network layer' (weak resolution — module/component term) |
| `conflict_resolver` | implementation_task | Referenced in task 'TASK-005: Implement ConflictResolver with hybrid policy' (weak resolution — module/component term) |
| `connectivity_observer` | implementation_task | Referenced in task 'TASK-004: Implement SyncQueueManager and RetryLedger' (weak resolution — module/component term) |
| `next_token` | conflict_policy_matrix | Found in conflict_policy_matrix 'sync_cursor' (policy: server_token) |
| `pending_report_repository` | implementation_task | Referenced in task 'TASK-002: Implement PendingReportRepository' (weak resolution — module/component term) |
| `report_id` | data_model_field | Field 'report_id' in PendingReportEntity (type: String) |
| `sync_queue_manager` | implementation_task | Referenced in task 'TASK-004: Implement SyncQueueManager and RetryLedger' (weak resolution — module/component term) |

