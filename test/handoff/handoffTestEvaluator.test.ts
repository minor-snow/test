/**
 * Tests for handoffTestEvaluator.ts
 *
 * ref: P11.2 — Cross-Model Handoff Test
 */

import { describe, it, expect } from "vitest";
import { evaluateHandoffTestOutput } from "../../src/handoff/handoffTestEvaluator.js";
import type { ImplementationHandoffPackage } from "../../src/handoff/types.js";

// ---------------------------------------------------------------------------
// Minimal mock package for testing
// ---------------------------------------------------------------------------

function makeMockPackage(overrides: Partial<ImplementationHandoffPackage> = {}): ImplementationHandoffPackage {
  return {
    package_id: "test",
    project_id: "test",
    created_at: "2026-01-01",
    source_artifacts: [],
    implementation_scope: {
      target_platform: "android",
      stack: ["Kotlin"],
      included_components: [],
      excluded_components: [],
      non_goals: [],
    },
    contract_definitions: [
      {
        term: "conflict_payload",
        kind: "schema",
        definition: "Server conflict response",
        fields: [
          { name: "report_id", type: "String", required: true, description: "Report" },
          { name: "local_version", type: "ReportSnapshot", required: true, description: "Local" },
          { name: "remote_version", type: "ReportSnapshot", required: true, description: "Remote" },
          { name: "local_clock", type: "VectorClock", required: true, description: "Local clock" },
          { name: "remote_clock", type: "VectorClock", required: true, description: "Remote clock" },
          { name: "conflicting_fields", type: "List<String>", required: true, description: "Fields" },
        ],
        source_architecture_blocks: ["b1"],
        source_interface_blocks: [],
        source_module_blocks: [],
      },
      {
        term: "pending_report",
        kind: "schema",
        definition: "Local triage report",
        fields: [
          { name: "report_id", type: "String", required: true, description: "ID" },
          { name: "status", type: "PendingReportState", required: true, description: "State" },
          { name: "vector_clock", type: "Map<String, Int>", required: false, description: "Clock" },
        ],
        source_architecture_blocks: ["b2"],
        source_interface_blocks: [],
        source_module_blocks: [],
      },
    ],
    conflict_policy_matrix: [
      {
        field_group: "patient_case_status",
        fields: ["case_status", "triage_urgency"],
        policy: "vector_clock",
        rationale: "Clinical",
        risk_level: "high",
        user_visible_on_conflict: true,
        audit_required: true,
        source_architecture_blocks: ["b1"],
        source_interface_blocks: [],
        source_module_blocks: [],
      },
      {
        field_group: "last_viewed_screen",
        fields: ["last_viewed_screen", "ui_state"],
        policy: "last_writer_wins",
        rationale: "UI metadata",
        risk_level: "low",
        user_visible_on_conflict: false,
        audit_required: false,
        source_architecture_blocks: ["b2"],
        source_interface_blocks: [],
        source_module_blocks: [],
      },
    ],
    data_models: [
      {
        name: "PendingReportEntity",
        kind: "room_entity",
        fields: [
          { name: "report_id", type: "String", description: "UUID PK", nullable: false, primary_key: true, indexed: false },
          { name: "status", type: "String", description: "State", nullable: false, primary_key: false, indexed: true, conflict_policy: "vector_clock" as const },
          { name: "retry_count", type: "Int", description: "Retries", nullable: false, primary_key: false, indexed: false, conflict_policy: "local_only" as const },
        ],
        invariants: [],
        source_architecture_blocks: ["b1"],
        source_interface_blocks: [],
        source_module_blocks: [],
      },
    ],
    state_machines: [
      {
        name: "PendingReportState",
        states: ["draft", "completed_offline", "queued_for_sync", "syncing", "merged", "conflicted"],
        allowed_transitions: [
          { from: "draft", to: "completed_offline", trigger: "triage_completed", audit_event_required: true },
        ],
        forbidden_transitions: [
          { from: "merged", to: "draft", reason: "Cannot revert" },
        ],
        source_architecture_blocks: ["b1"],
        source_interface_blocks: [],
        source_module_blocks: [],
      },
    ],
    implementation_tasks: [],
    risk_notes: [],
    forbidden_assumptions: [
      {
        assumption_id: "FA-001",
        statement: "Do not use LWW for clinical fields",
        reason: "Clinical data needs vector clock",
        source_blocks: ["b1"],
      },
    ],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("handoffTestEvaluator", () => {
  describe("clean output", () => {
    it("passes for compliant Kotlin code", () => {
      const output = `
enum class PendingReportState {
  DRAFT,
  COMPLETED_OFFLINE,
  QUEUED_FOR_SYNC,
  SYNCING,
  MERGED,
  CONFLICTED
}

@Entity(tableName = "pending_reports")
data class PendingReportEntity(
  @PrimaryKey
  @ColumnInfo(name = "report_id") val reportId: String,
  @ColumnInfo(name = "status") val status: String,
  @ColumnInfo(name = "retry_count") val retryCount: Int,
  @ColumnInfo(name = "vector_clock_json") val vectorClockJson: String?
)

data class VectorClock(
  val entries: Map<String, Int>
)

data class ConflictPayload(
  val reportId: String,
  val localVersion: ReportSnapshot,
  val remoteVersion: ReportSnapshot,
  val localClock: VectorClock,
  val remoteClock: VectorClock,
  val conflictingFields: List<String>
)

@Test fun conflictDetectionTriggersReview() { }
@Test fun vectorClockMergeTest() { }
class AuditEventWriter { }
      `;
      const pkg = makeMockPackage();
      const result = evaluateHandoffTestOutput("test_model", output, pkg);

      // pass_with_warnings because camelCase fields are counted as "invented" 
      // (e.g. reportId, vectorClockJson, localVersion, etc.)
      expect(result.status).toBe("pass_with_warnings");
      expect(result.critical_violations).toHaveLength(0);
      expect(result.metrics.invented_states).toBe(0);
      expect(result.metrics.clinical_lww_violations).toBe(0);
      expect(result.metrics.vector_clock_omissions).toBe(0);
    });
  });

  describe("invented states", () => {
    it("detects states not in handoff state machine", () => {
      const output = `
enum class PendingReportState {
  DRAFT,
  COMPLETED_OFFLINE,
  QUEUED_FOR_SYNC,
  SYNCING,
  MERGED,
  CONFLICTED,
  CANCELLED,
  ARCHIVED
}
      `;
      const pkg = makeMockPackage();
      const result = evaluateHandoffTestOutput("test_model", output, pkg);

      expect(result.metrics.invented_states).toBeGreaterThan(0);
      expect(result.critical_violations.some(v => v.type === "invented_state")).toBe(true);
    });
  });

  describe("clinical LWW violations", () => {
    it("detects LWW used near clinical fields", () => {
      const output = `
// Conflict resolution for case_status
val policy = last_writer_wins  // apply LWW to case_status
      `;
      const pkg = makeMockPackage();
      const result = evaluateHandoffTestOutput("test_model", output, pkg);

      expect(result.metrics.clinical_lww_violations).toBeGreaterThan(0);
      expect(result.critical_violations.some(v => v.type === "clinical_lww_violation")).toBe(true);
    });

    it("does not flag LWW for non-clinical fields", () => {
      const output = `
// Use last_writer_wins for last_viewed_screen and ui_state
      `;
      const pkg = makeMockPackage();
      const result = evaluateHandoffTestOutput("test_model", output, pkg);

      expect(result.metrics.clinical_lww_violations).toBe(0);
    });
  });

  describe("vector clock presence", () => {
    it("detects missing VectorClock when clinical fields present", () => {
      const output = `
data class PendingReportEntity(
  val reportId: String,
  val status: String
)
// No vector clock type defined
      `;
      const pkg = makeMockPackage();
      const result = evaluateHandoffTestOutput("test_model", output, pkg);

      expect(result.metrics.vector_clock_omissions).toBe(1);
      expect(result.critical_violations.some(v => v.type === "vector_clock_omission")).toBe(true);
    });

    it("passes when VectorClock present", () => {
      const output = `
data class VectorClock(val entries: Map<String, Int>)
      `;
      const pkg = makeMockPackage();
      const result = evaluateHandoffTestOutput("test_model", output, pkg);

      expect(result.metrics.vector_clock_omissions).toBe(0);
    });
  });

  describe("audit required", () => {
    it("warns when no audit mechanism found", () => {
      const output = `
data class Foo(val id: String)
      `;
      const pkg = makeMockPackage();
      const result = evaluateHandoffTestOutput("test_model", output, pkg);

      expect(result.metrics.audit_required_omissions).toBe(1);
      expect(result.warnings.some(w => w.type === "audit_required_omission")).toBe(true);
    });

    it("passes when audit mentioned", () => {
      const output = `
class AuditEventWriter { fun write() {} }
      `;
      const pkg = makeMockPackage();
      const result = evaluateHandoffTestOutput("test_model", output, pkg);

      expect(result.metrics.audit_required_omissions).toBe(0);
    });
  });

  describe("conflict tests", () => {
    it("warns when no conflict-related tests found", () => {
      const output = `
@Test fun insertReport() { }
@Test fun queryAll() { }
      `;
      const pkg = makeMockPackage();
      const result = evaluateHandoffTestOutput("test_model", output, pkg);

      expect(result.metrics.missing_conflict_tests).toBe(1);
    });

    it("passes when conflict test exists", () => {
      const output = `
@Test fun conflictResolutionTest() { }
      `;
      const pkg = makeMockPackage();
      const result = evaluateHandoffTestOutput("test_model", output, pkg);

      expect(result.metrics.missing_conflict_tests).toBe(0);
    });
  });

  describe("overall status", () => {
    it("returns fail when critical violations exist", () => {
      const output = `
enum class PendingReportState { DRAFT, COMPLETED_OFFLINE, QUEUED_FOR_SYNC, SYNCING, MERGED, CONFLICTED, ZOMBIE }
      `;
      const pkg = makeMockPackage();
      const result = evaluateHandoffTestOutput("test_model", output, pkg);

      expect(result.status).toBe("fail");
    });

    it("returns pass_with_warnings when only warnings exist", () => {
      const output = `
data class VectorClock(val entries: Map<String, Int>)
data class ConflictPayload(
  val reportId: String,
  val localVersion: ReportSnapshot,
  val remoteVersion: ReportSnapshot,
  val localClock: VectorClock,
  val remoteClock: VectorClock,
  val conflictingFields: List<String>
)
class AuditEventWriter { fun write() {} }
@Test fun someTest() { }
// Has VectorClock, Audit, ConflictPayload, but no conflict test
      `;
      const pkg = makeMockPackage();
      const result = evaluateHandoffTestOutput("test_model", output, pkg);

      // Should have warnings (missing conflict tests, invented fields) but no critical
      expect(result.critical_violations).toHaveLength(0);
      expect(result.status).toBe("pass_with_warnings");
    });
  });
});
