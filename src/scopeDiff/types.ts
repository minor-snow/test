/**
 * P18: Scope Diff Validator — Types
 *
 * Data structures for validating whether downstream implementation
 * stayed inside the Pantheon-exported scoped boundary.
 *
 * ref: P18
 */

// ---------------------------------------------------------------------------
// Request
// ---------------------------------------------------------------------------

export type TestResultStatus = "passed" | "failed" | "skipped" | "not_run";

export type TestResult = {
  test_id: string;
  test_name?: string;
  status: TestResultStatus;
};

export type HumanReviewInput = {
  provided: boolean;
  reviewer_id?: string;
  rationale?: string;
};

export type ScopeDiffOptions = {
  allow_generated_boundary_edits?: boolean;
  treat_missing_tests_as_warning?: boolean;
  allow_test_name_fallback?: boolean;
};

export type ScopeDiffRequest = {
  scope_path: string;
  required_tests_path: string;

  changed_files?: string[];
  diff_text?: string;

  test_results?: TestResult[];

  human_review?: HumanReviewInput;

  options?: ScopeDiffOptions;
};

// ---------------------------------------------------------------------------
// File Classification
// ---------------------------------------------------------------------------

export type ClassifiedChangedFile = {
  file_path: string;

  is_allowed: boolean;
  is_forbidden: boolean;
  is_protocol_file: boolean;
  is_generated_boundary_file: boolean;

  matched_allowed?: string;
  matched_forbidden?: string;

  reason: string;
};

// ---------------------------------------------------------------------------
// Violations
// ---------------------------------------------------------------------------

export type ScopeDiffViolationType =
  | "outside_allowed_files"
  | "forbidden_file_modified"
  | "protocol_file_modified"
  | "generated_boundary_modified"
  | "required_test_missing"
  | "required_test_failed"
  | "required_tests_scope_mismatch"
  | "human_review_missing"
  | "reverse_issue_required";

export type ScopeDiffViolation = {
  violation_id: string;
  violation_type: ScopeDiffViolationType;
  severity: "low" | "medium" | "high";
  file_path?: string;
  test_id?: string;
  message: string;
  required_action: string;
  source?: {
    scope_id: string;
    source_nodes?: string[];
    rule?: string;
  };
};

// ---------------------------------------------------------------------------
// Warnings
// ---------------------------------------------------------------------------

export type ScopeDiffWarningType =
  | "unrecognized_file"
  | "test_result_extra"
  | "generated_file_modified_but_allowed"
  | "human_review_rationale_short"
  | "diff_parse_partial"
  | "input_precedence_notice"
  | "legacy_test_name_match";

export type ScopeDiffWarning = {
  warning_id: string;
  warning_type: ScopeDiffWarningType;
  message: string;
};

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

export type ScopeDiffStatus =
  | "pass"
  | "fail"
  | "requires_reverse_issue"
  | "requires_human_review";

export type ScopeDiffReport = {
  generated_at: string;
  scope_id: string;

  status: ScopeDiffStatus;

  source: {
    scope_path: string;
    required_tests_path: string;
    scope_hash: string;
    required_tests_hash: string;
  };

  summary: {
    changed_files: number;
    allowed_files_modified: number;
    outside_scope_files: number;
    forbidden_files_modified: number;
    protocol_files_modified: number;
    generated_boundary_files_modified: number;

    required_tests: number;
    required_tests_passed: number;
    required_tests_failed: number;
    required_tests_missing: number;

    reverse_issue_triggers: number;
  };

  blocking_reasons: string[];

  violations: ScopeDiffViolation[];

  warnings: ScopeDiffWarning[];

  required_actions: string[];
};
