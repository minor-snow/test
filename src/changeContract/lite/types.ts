/**
 * P20a: ChangeContract Lite — Domain Types
 *
 * Physically isolated from full ChangeContract.
 * No lifecycle_status, no result_events, no verification machinery.
 * Mode is always "bootstrap".
 */

// ---------------------------------------------------------------------------
// Changed file observation status
// ---------------------------------------------------------------------------

export type ChangedFileObservationStatus =
  | "observed"
  | "excluded"
  | "not_observed"
  | "path_invalid";

export type ChangedFileStatus = {
  readonly path: string;
  readonly status: ChangedFileObservationStatus;
  readonly reason: string;
};

// ---------------------------------------------------------------------------
// Structured detail types (P22: agent-consumable facts)
// ---------------------------------------------------------------------------

export type SensitivePathDetail = {
  readonly path: string;
  readonly reason: string;
};

export type UndeclaredPackageDetail = {
  readonly file_path: string;
  readonly package_name: string;
};

export type UnmappedSrcDetail = {
  readonly path: string;
};

// ---------------------------------------------------------------------------
// Lite verdict
// ---------------------------------------------------------------------------

export type LiteVerdict =
  | "pass"
  | "requires_review"
  | "requires_reverse_issue"
  | "fail";

// ---------------------------------------------------------------------------
// ChangeContract Lite
// ---------------------------------------------------------------------------

export type ChangeContractLite = {
  readonly schema_version: "change_contract_lite.v1";
  readonly contract_id: string;
  readonly mode: "bootstrap";
  readonly created_at: string;
  readonly intent?: string;

  readonly refs: {
    readonly repo_observations_hash: string;
    readonly head_commit_hash: string | null;
    readonly repo_state: "git_clean" | "git_dirty" | "working_tree_only";
    readonly has_uncommitted_changes: boolean | null;
  };

  readonly changed_files: readonly string[];

  readonly observed_scope: {
    readonly touched_buckets: readonly string[];
    readonly touched_sensitive_paths: readonly string[];
    readonly related_tests: readonly string[];
    readonly owner_hints: readonly string[];
    readonly unknowns: readonly string[];
    readonly changed_file_statuses: readonly ChangedFileStatus[];
    /** P22: Structured sensitive path details for agent feedback. */
    readonly sensitive_path_details?: readonly SensitivePathDetail[];
    /** P22: Structured undeclared package details for agent feedback. */
    readonly undeclared_package_details?: readonly UndeclaredPackageDetail[];
    /** P22: Source files with no test mapping for agent feedback. */
    readonly unmapped_src_details?: readonly UnmappedSrcDetail[];
  };

  readonly decision: {
    readonly verdict: LiteVerdict;
    readonly reasons: readonly string[];
    readonly required_actions: readonly string[];
  };
};

// ---------------------------------------------------------------------------
// Validation result
// ---------------------------------------------------------------------------

export type LiteValidationResult = {
  readonly status: "valid" | "invalid";
  readonly errors: string[];
  readonly warnings: string[];
};
