import androidx.room.*
import java.time.Instant

@Entity(tableName = "pending_reports")
data class PendingReportEntity(
    @PrimaryKey @ColumnInfo(name = "report_id") val reportId: String,
    @ColumnInfo(name = "clinic_id") val clinicId: String,
    @ColumnInfo(name = "patient_case_id") val patientCaseId: String,
    @ColumnInfo(name = "triage_result_json") val triageResultJson: String,
    @ColumnInfo(name = "status") val status: PendingReportState,
    @ColumnInfo(name = "created_at") val createdAt: Instant,
    @ColumnInfo(name = "updated_at") val updatedAt: Instant,
    @ColumnInfo(name = "vector_clock_json") val vectorClockJson: String?,
    @ColumnInfo(name = "retry_count") val retryCount: Int,
    @ColumnInfo(name = "last_error") val lastError: String?
)

@Entity(tableName = "sync_operations")
data class SyncOperationEntity(
    @PrimaryKey @ColumnInfo(name = "operation_id") val operationId: String,
    @ColumnInfo(name = "report_id") val reportId: String,
    @ColumnInfo(name = "clinic_id") val clinicId: String,
    @ColumnInfo(name = "status") val status: SyncOperationState,
    @ColumnInfo(name = "created_at") val createdAt: Instant,
    @ColumnInfo(name = "started_at") val startedAt: Instant?,
    @ColumnInfo(name = "completed_at") val completedAt: Instant?
)

@Entity(tableName = "retry_ledger")
data class RetryLedgerEntry(
    @PrimaryKey @ColumnInfo(name = "entry_id") val entryId: String,
    @ColumnInfo(name = "report_id") val reportId: String,
    @ColumnInfo(name = "attempt_number") val attemptNumber: Int,
    @ColumnInfo(name = "timestamp") val timestamp: Instant,
    @ColumnInfo(name = "http_status") val httpStatus: Int?,
    @ColumnInfo(name = "error_code") val errorCode: String?,
    @ColumnInfo(name = "next_retry_at") val nextRetryAt: Instant?
)

@Entity(tableName = "conflict_records")
data class ConflictRecordEntity(
    @PrimaryKey @ColumnInfo(name = "conflict_id") val conflictId: String,
    @ColumnInfo(name = "report_id") val reportId: String,
    @ColumnInfo(name = "conflict_type") val conflictType: ConflictType,
    @ColumnInfo(name = "local_version_json") val localVersionJson: String,
    @ColumnInfo(name = "remote_version_json") val remoteVersionJson: String,
    @ColumnInfo(name = "conflicting_fields_json") val conflictingFieldsJson: String,
    @ColumnInfo(name = "resolution_status") val resolutionStatus: ConflictResolutionState,
    @ColumnInfo(name = "resolved_by") val resolvedBy: String?,
    @ColumnInfo(name = "resolved_at") val resolvedAt: Instant?
)

@Entity(tableName = "vector_clock_entries")
data class VectorClockEntry(
    @PrimaryKey @ColumnInfo(name = "clock_id") val clockId: String,
    @ColumnInfo(name = "report_id") val reportId: String,
    @ColumnInfo(name = "actor_id") val actorId: String,
    @ColumnInfo(name = "sequence_number") val sequenceNumber: Int
)

@Entity(tableName = "audit_events")
data class AuditEventEntity(
    @PrimaryKey @ColumnInfo(name = "event_id") val eventId: String,
    @ColumnInfo(name = "timestamp") val timestamp: Instant,
    @ColumnInfo(name = "actor_id") val actorId: String,
    @ColumnInfo(name = "action_type") val actionType: String,
    @ColumnInfo(name = "report_id") val reportId: String?,
    @ColumnInfo(name = "payload_checksum") val payloadChecksum: String,
    @ColumnInfo(name = "details_json") val detailsJson: String?
)

data class ConflictPayload(
    val reportId: String,
    val localVersion: String,
    val remoteVersion: String,
    val localClock: Map<String, Int>,
    val remoteClock: Map<String, Int>,
    val conflictingFields: List<String>
)

data class VectorClock(val entries: Map<String, Int>)

data class OfflineReportEnvelope(
    val reportId: String,
    val clinicId: String,
    val patientCaseId: String,
    val triageResult: String,
    val createdAt: String,
    val deviceId: String,
    val vectorClock: Map<String, Int>
)

data class SyncUploadResult(
    val status: String,
    val serverClock: Map<String, Int>,
    val conflictPayload: ConflictPayload?
)

enum class PendingReportState {
    draft, completed_offline, queued_for_sync, syncing, merged, conflicted, requires_review, failed_retryable, failed_terminal
}

enum class SyncOperationState {
    queued, in_flight, acknowledged, retry_scheduled, conflict_detected, dead_lettered
}

enum class ConflictResolutionState {
    auto_merged, lww_applied, vector_conflict, manual_review_required, clinician_resolved
}

enum class ConflictType {
    vector_clock_divergence, lww_overwrite, schema_version_mismatch
}

enum class ConflictPolicy {
    vector_clock, server_token, local_only, last_writer_wins
}