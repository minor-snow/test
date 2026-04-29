/**
 * Implementation Handoff Package — Type Definitions
 *
 * ref: P11a-001
 *
 * These types define a derived projection from P10 canonical artifacts.
 * They are NOT part of the core Artifact schema.
 */
export type SourceArtifactRef = {
    artifact_id: string;
    artifact_type: string;
    revision_id: string;
};
export type ImplementationScope = {
    target_platform: "android";
    stack: string[];
    included_components: string[];
    excluded_components: string[];
    non_goals: string[];
};
export type ContractDefinitionKind = "field" | "schema" | "enum" | "state" | "module" | "policy" | "identifier" | "external_concept";
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
export type ConflictPolicy = "vector_clock" | "last_writer_wins" | "server_token" | "local_only" | "manual_review" | "derived_recompute";
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
export type ImplementationTask = {
    task_id: string;
    title: string;
    target_module: string;
    description: string;
    source_blocks: string[];
    acceptance_criteria: string[];
    required_tests: string[];
};
export type RiskNote = {
    risk_id: string;
    severity: "low" | "medium" | "high";
    description: string;
    mitigation: string;
    source_blocks: string[];
};
export type ForbiddenAssumption = {
    assumption_id: string;
    statement: string;
    reason: string;
    source_blocks: string[];
};
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
export type ImplementationIssueType = "missing_field" | "wrong_type" | "missing_state" | "wrong_transition" | "missing_interface" | "contract_mismatch" | "acceptance_gap" | "other";
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
