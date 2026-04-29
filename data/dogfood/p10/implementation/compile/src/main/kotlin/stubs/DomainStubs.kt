/**
 * Domain type stubs for P12.1 compile harness.
 * These represent types referenced in generated DTOs and entities
 * that would be fully implemented in the real Android project.
 *
 * ref: P12.1 — Kotlin Compile Harness
 */

/** Output from OfflineDecisionTreeRunner */
data class TriageResult(
    val ruleVersion: String = "",
    val outcome: String = "",
)

/** Snapshot of a report at a point in time (used in ConflictPayload) */
typealias ReportSnapshot = String

/** A single change from the server (used in SyncChangePullResponse) */
data class RemoteChange(
    val reportId: String = "",
    val changeType: String = "",
)

/** Causal version vector (alias for the map used throughout) */
typealias VectorClock = Map<String, Int>
