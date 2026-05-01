/**
 * P29.5: Contract Gate Types
 *
 * Core domain types for the Contract Required Gate.
 * These types are internal to the gate evaluation pipeline.
 * The public-facing verdict is unified via PantheonCheckVerdict in cli/types.ts.
 *
 * Design invariants:
 *   - ContractGateVerdict is separate from RepairVerdict (different semantic domains).
 *   - ContractGateResult is the sole output of the gate evaluator.
 *   - Policy source always records where the policy came from.
 *   - Metrics flags are booleans for aggregation simplicity.
 *
 * ref: P29.5
 */

// ---------------------------------------------------------------------------
// Verdicts
// ---------------------------------------------------------------------------

/**
 * Internal verdict for the contract gate layer.
 * Distinct from RepairVerdict — the gate answers "should a contract exist?"
 * while RepairVerdict answers "does this diff comply with an existing contract?"
 */
export type ContractGateVerdict =
  | "pass"
  | "requires_review"
  | "requires_contract"
  | "requires_replan"
  | "fail";

// ---------------------------------------------------------------------------
// Policy Source
// ---------------------------------------------------------------------------

export type PolicySourceMode =
  | "base_branch"
  | "local_base"
  | "current_worktree";

export type PolicySourceStatus =
  | "loaded"
  | "missing"
  | "parse_error"
  | "fallback_default";

export type PolicySource = {
  readonly mode: PolicySourceMode;
  readonly status: PolicySourceStatus;
  readonly base_sha?: string;
  readonly policy_revision?: string;
};

// ---------------------------------------------------------------------------
// File-level findings
// ---------------------------------------------------------------------------

export type ContractGateFileBucket =
  | "low_risk"
  | "source"
  | "test"
  | "docs"
  | "review_required"
  | "policy_sensitive"
  | "contract_artifact"
  | "generated_artifact"
  | "workflow"
  | "forbidden"
  | "unknown";

export type ContractGateRiskLevel = "low" | "medium" | "high" | "critical";

export type ContractGateFileFinding = {
  readonly path: string;
  readonly bucket: ContractGateFileBucket;
  readonly risk_level: ContractGateRiskLevel;
  readonly reasons: readonly string[];
  readonly contract_required: boolean;
  readonly trusted_approval_required: boolean;
};

// ---------------------------------------------------------------------------
// Semantic findings
// ---------------------------------------------------------------------------

export type ContractGateFindingKind =
  | "missing_contract"
  | "stale_contract"
  | "policy_tamper"
  | "workflow_touched"
  | "generated_artifact_touched"
  | "package_execution_surface_touched"
  | "public_api_touched"
  | "architecture_boundary_touched"
  | "fake_approval_ignored"
  | "pr_authored_contract_ignored"
  | "trusted_approval_missing"
  | "low_risk_bypass_applied"
  | "base_policy_missing";

export type ContractGateFindingSeverity = "info" | "warning" | "blocking" | "critical";

export type ContractGateFindingAction =
  | "none"
  | "create_contract"
  | "request_review"
  | "request_replan"
  | "fail_closed";

export type ContractGateFinding = {
  readonly kind: ContractGateFindingKind;
  readonly severity: ContractGateFindingSeverity;
  readonly path?: string;
  readonly message: string;
  readonly action: ContractGateFindingAction;
};

// ---------------------------------------------------------------------------
// Contract status
// ---------------------------------------------------------------------------

export type ActiveContractStatus =
  | "valid"
  | "missing"
  | "stale"
  | "revision_mismatch"
  | "base_sha_mismatch"
  | "untrusted_pr_authored"
  | "superseded"
  | "not_required";

export type ActiveContractResolution = {
  readonly status: ActiveContractStatus;
  readonly contract_type?: "repair" | "change";
  readonly contract_id?: string;
  readonly reason: string;
};

// ---------------------------------------------------------------------------
// Trusted approval
// ---------------------------------------------------------------------------

export type TrustedApprovalSource =
  | "github_review"
  | "codeowners"
  | "maintainer_label"
  | "workflow_dispatch"
  | "local_audit"
  | "none";

export type TrustedApprovalSummary = {
  readonly trusted: boolean;
  readonly source: TrustedApprovalSource;
  readonly actor?: string;
  readonly permission?: "read" | "triage" | "write" | "maintain" | "admin";
  readonly reviewed_paths?: readonly string[];
  readonly approved_at?: string;
};

// ---------------------------------------------------------------------------
// Required action block
// ---------------------------------------------------------------------------

export type RequiredActionBlock = {
  readonly why: readonly string[];
  readonly next: readonly string[];
};

// ---------------------------------------------------------------------------
// Gate metrics
// ---------------------------------------------------------------------------

export type ContractGateMetrics = {
  readonly uncontracted_change_detected: boolean;
  readonly policy_tamper_detected: boolean;
  readonly fake_approval_ignored: boolean;
  readonly high_risk_surface_touched: boolean;
};

// ---------------------------------------------------------------------------
// Top-level result
// ---------------------------------------------------------------------------

export type ContractGateResult = {
  readonly schema: "pantheon.contract_gate_result.v1";
  readonly verdict: ContractGateVerdict;
  readonly risk_level: ContractGateRiskLevel;
  readonly contract_status: ActiveContractStatus;
  readonly policy_source: PolicySource;
  readonly changed_files: readonly ContractGateFileFinding[];
  readonly findings: readonly ContractGateFinding[];
  readonly trusted_approval?: TrustedApprovalSummary;
  readonly required_action: RequiredActionBlock;
  readonly metrics: ContractGateMetrics;
};

// ---------------------------------------------------------------------------
// Policy tamper detection
// ---------------------------------------------------------------------------

export type PolicyTamperClassification =
  | "policy_sensitive"
  | "workflow_sensitive"
  | "contract_artifact"
  | "approval_artifact";

export type PolicyTamperFinding = {
  readonly path: string;
  readonly classification: PolicyTamperClassification;
  readonly message: string;
};

export type PolicyTamperResult = {
  readonly detected: boolean;
  readonly findings: readonly PolicyTamperFinding[];
};

// ---------------------------------------------------------------------------
// PR-authored artifact guard
// ---------------------------------------------------------------------------

export type PrArtifactGuardResult = {
  readonly fake_approval_detected: boolean;
  readonly ignored_artifacts: readonly string[];
  readonly findings: readonly ContractGateFinding[];
};

// ---------------------------------------------------------------------------
// Contract requirement policy output
// ---------------------------------------------------------------------------

export type ContractRequirementResult = {
  readonly risk_level: ContractGateRiskLevel;
  readonly contract_required: boolean;
  readonly contract_reason?: string;
  readonly low_risk_bypass_applied: boolean;
  readonly file_findings: readonly ContractGateFileFinding[];
};
