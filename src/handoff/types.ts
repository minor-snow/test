/**
 * Implementation Handoff Package — Type Definitions
 *
 * ref: P11a-001
 *
 * These types define a derived projection from P10 canonical artifacts.
 * They are NOT part of the core Artifact schema.
 */

// ---------------------------------------------------------------------------
// Source Provenance
// ---------------------------------------------------------------------------

export type SourceArtifactRef = {
  artifact_id: string;
  artifact_type: string;
  revision_id: string;
};

// ---------------------------------------------------------------------------
// Implementation Scope
// ---------------------------------------------------------------------------

export type ImplementationScope = {
  target_platform: "android";
  stack: string[];
  included_components: string[];
  excluded_components: string[];
  non_goals: string[];
};

// ---------------------------------------------------------------------------
// Contract Definitions
// ---------------------------------------------------------------------------

export type ContractDefinitionKind =
  | "field"
  | "schema"
  | "enum"
  | "state"
  | "module"
  | "policy"
  | "identifier"
  | "external_concept";

export type ContractDefinition = {
  term: string;
  kind: ContractDefinitionKind;
  definition: string;

  fields?: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
  }>;

  enum_values?: Array<{
    value: string;
    description: string;
  }>;

  source_architecture_blocks: string[];
  source_interface_blocks: string[];
  source_module_blocks: string[];
};

// ---------------------------------------------------------------------------
// Conflict Policy
// ---------------------------------------------------------------------------

export type ConflictPolicy =
  | "vector_clock"
  | "last_writer_wins"
  | "server_token"
  | "local_only"
  | "manual_review"
  | "derived_recompute";

export type ConflictPolicyEntry = {
  field_group: string;
  fields: string[];
  policy: ConflictPolicy;
  rationale: string;
  risk_level: "low" | "medium" | "high";
  user_visible_on_conflict: boolean;
  audit_required: boolean;
  source_architecture_blocks: string[];
  source_interface_blocks: string[];
  source_module_blocks: string[];
};

// ---------------------------------------------------------------------------
// Data Models
// ---------------------------------------------------------------------------

export type DataModelKind = "room_entity" | "network_dto" | "value_object";

export type DataModelField = {
  name: string;
  type: string;
  nullable: boolean;
  primary_key?: boolean;
  indexed?: boolean;
  description: string;
  conflict_policy?: ConflictPolicy;
};

export type DataModelSpec = {
  name: string;
  kind: DataModelKind;
  fields: DataModelField[];
  invariants: string[];
  source_architecture_blocks: string[];
  source_interface_blocks: string[];
  source_module_blocks: string[];
};

// ---------------------------------------------------------------------------
// State Machines
// ---------------------------------------------------------------------------

export type StateTransition = {
  from: string;
  to: string;
  trigger: string;
  audit_event_required: boolean;
};

export type ForbiddenTransition = {
  from: string;
  to: string;
  reason: string;
};

export type StateMachineSpec = {
  name: string;
  states: string[];
  allowed_transitions: StateTransition[];
  forbidden_transitions: ForbiddenTransition[];
  source_architecture_blocks: string[];
  source_interface_blocks: string[];
  source_module_blocks: string[];
};

// ---------------------------------------------------------------------------
// Implementation Tasks
// ---------------------------------------------------------------------------

export type ImplementationTask = {
  task_id: string;
  title: string;
  target_module: string;
  description: string;
  source_blocks: string[];
  acceptance_criteria: string[];
  required_tests: string[];
};

// ---------------------------------------------------------------------------
// Risk Notes
// ---------------------------------------------------------------------------

export type RiskNote = {
  risk_id: string;
  severity: "low" | "medium" | "high";
  description: string;
  mitigation: string;
  source_blocks: string[];
};

// ---------------------------------------------------------------------------
// Forbidden Assumptions
// ---------------------------------------------------------------------------

export type ForbiddenAssumption = {
  assumption_id: string;
  statement: string;
  reason: string;
  source_blocks: string[];
};

// ---------------------------------------------------------------------------
// Handoff Package (top-level)
// ---------------------------------------------------------------------------

export type ImplementationHandoffPackage = {
  package_id: string;
  project_id: string;
  created_at: string;

  source_artifacts: SourceArtifactRef[];
  implementation_scope: ImplementationScope;

  contract_definitions: ContractDefinition[];
  conflict_policy_matrix: ConflictPolicyEntry[];
  data_models: DataModelSpec[];
  state_machines: StateMachineSpec[];
  implementation_tasks: ImplementationTask[];
  risk_notes: RiskNote[];
  forbidden_assumptions: ForbiddenAssumption[];
};

// ---------------------------------------------------------------------------
// Readiness Report
// ---------------------------------------------------------------------------

export type ReadinessCheckStatus = "pass" | "fail" | "warning";

export type ReadinessCheck = {
  check_id: string;
  status: ReadinessCheckStatus;
  message: string;
};

export type HandoffReadinessReport = {
  status: "ready" | "ready_with_risks" | "not_ready";
  checks: ReadinessCheck[];
  critical_violations: string[];
  generated_at: string;
};

// ---------------------------------------------------------------------------
// P13-B: Implementation Issue (reverse feedback)
// ---------------------------------------------------------------------------

export type ImplementationIssueType =
  | "missing_field"
  | "wrong_type"
  | "missing_state"
  | "wrong_transition"
  | "missing_interface"
  | "contract_mismatch"
  | "acceptance_gap"
  | "other";

export type ImplementationIssue = {
  issue_id: string;
  created_at: string;
  target_artifact_id: string;
  target_block_id: string;
  issue_type: ImplementationIssueType;
  description: string;
  implementation_context: string;
  suggested_contract_change?: string;
  status: "open" | "triaged" | "patched" | "rejected";
};

// ---------------------------------------------------------------------------
// P13-C: Uncertainty Register
// ---------------------------------------------------------------------------

export type UncertaintyStatus = "open" | "resolved" | "accepted_risk";

export type UncertaintyEntry = {
  uncertainty_id: string;
  question: string;
  affected_artifacts: string[];
  affected_blocks: string[];
  blocking_decisions: string[];
  resolution_criteria: string;
  status: UncertaintyStatus;
  created_at: string;
  resolved_at?: string;
  created_from_issue_id?: string;
};

export type UncertaintyRegister = {
  entries: UncertaintyEntry[];
};
