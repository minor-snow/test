/**
 * P17: Scoped Implementation Boundary Protocol — Types
 *
 * Defines the tool-agnostic protocol package (.pantheon/scope.json)
 * that downstream AI coding agents must respect.
 *
 * Core invariants:
 * - Technical IDs (node_id, file_path, symbol_name) are NEVER translated.
 * - .pantheon/ is vendor-neutral protocol, .cursor/ is the first adapter.
 * - handoff.json is reference-only, never a scoped subset dump.
 * - enforced_by in v1 is heuristic-derived and must be labeled.
 *
 * ref: P17
 */

// ---------------------------------------------------------------------------
// Core Package
// ---------------------------------------------------------------------------

export type ScopedImplementationBoundaryPackage = {
  scope_id: string;
  created_at: string;

  source: {
    handoff_package_hash: string;
    boundary_graph_hash: string;
    blast_radius_report_hash: string;
    locale: "en" | "zh-CN";
    generator_version: string;
  };

  request: {
    changed_nodes: string[];
    change_description?: string;
  };

  summary: {
    risk_level: "low" | "medium" | "high";
    must_require_human_review: boolean;
    downstream_nodes: number;
    affected_files: number;
    affected_symbols: number;
    affected_tests: number;
  };

  allowed_files: ScopedFile[];
  forbidden_files: ScopedFilePattern[];

  required_tests: RequiredTest[];
  affected_symbols: ScopedSymbol[];

  must_preserve: Constraint[];
  forbidden_assumptions: ForbiddenAssumptionExport[];

  risk_amplification: RiskExport[];

  reverse_issue_required_if: ReverseIssueTrigger[];

  implementation_context: string;
  human_readable_summary: string;
};

// ---------------------------------------------------------------------------
// Scoped Files
// ---------------------------------------------------------------------------

export type ScopedFileOrigin =
  | "blast_radius_generated"
  | "scoped_human_owned"
  | "manual_operator_added";

export type ScopedFileOperation = "read" | "modify" | "regenerate" | "test";

export type ScopedFile = {
  path: string;
  origin: ScopedFileOrigin;
  reason: string;
  source_nodes: string[];
  allowed_operations: ScopedFileOperation[];
};

export type ScopedFilePattern = {
  pattern: string;
  reason: string;
};

// ---------------------------------------------------------------------------
// Required Tests
// ---------------------------------------------------------------------------

export type TestRequirement = "must_run" | "must_update_if_behavior_changes";

export type RequiredTest = {
  test_id: string;
  test_name: string;
  file_path?: string;
  requirement: TestRequirement;
  reason: string;
  source_nodes: string[];
};

/**
 * The shape of .pantheon/required-tests.json.
 * scope_id and source_scope_hash are required for P18 scope binding validation.
 */
export type RequiredTestsFile = {
  scope_id: string;
  source_scope_hash: string;
  generated_at: string;
  required_tests: RequiredTest[];
};

// ---------------------------------------------------------------------------
// Scoped Symbols
// ---------------------------------------------------------------------------

export type ScopedSymbol = {
  symbol_id: string;
  symbol_name: string;
  file_path: string;
  reason: string;
  source_nodes: string[];
};

// ---------------------------------------------------------------------------
// Constraints
// ---------------------------------------------------------------------------

export type EnforcementKind = "guard" | "test" | "generated_file" | "contract";

export type EnforcementRef = {
  kind: EnforcementKind;
  id: string;
  file_path?: string;
  /** v1 uses heuristic downstream analysis. Labeled for upgrade in P18. */
  enforcement_source?: "explicit_edge" | "heuristic_downstream_match";
};

export type Constraint = {
  constraint_id: string;
  statement: string;
  severity: "low" | "medium" | "high";
  source_nodes: string[];
  enforced_by: EnforcementRef[];
};

// ---------------------------------------------------------------------------
// Forbidden Assumptions
// ---------------------------------------------------------------------------

export type ForbiddenAssumptionExport = {
  assumption_id: string;
  statement: string;
  reason: string;
  source_nodes: string[];
  enforced_by: EnforcementRef[];
};

// ---------------------------------------------------------------------------
// Risk
// ---------------------------------------------------------------------------

export type RiskExport = {
  risk_id: string;
  label: string;
  risk_level: "low" | "medium" | "high";
  reason: string;
  source_path: string[];
  affected_tests: string[];
};

// ---------------------------------------------------------------------------
// Reverse Issue
// ---------------------------------------------------------------------------

export type ReverseIssueTrigger = {
  trigger_id: string;
  condition: string;
  required_action: string;
  example_command: string;
};

// ---------------------------------------------------------------------------
// Handoff Reference (reference-only, no subset dump)
// ---------------------------------------------------------------------------

export type HandoffReference = {
  handoff_package_hash: string;
  handoff_package_path: string;
  relevant_nodes: string[];
  relevant_source_blocks: string[];
  note: string;
};

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type ValidationSeverity = "error" | "warning" | "info";

export type ValidationEntry = {
  check_id: string;
  severity: ValidationSeverity;
  message: string;
  details?: string;
};

export type ValidationResult = {
  status: "pass" | "pass_with_warnings" | "fail";
  entries: ValidationEntry[];
  error_count: number;
  warning_count: number;
};

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

export type ScopedHandoffReport = {
  scope_id: string;
  created_at: string;

  status: "ready" | "ready_with_warnings" | "invalid";

  validation: ValidationResult;

  outputs: string[];

  summary: {
    risk_level: "low" | "medium" | "high";
    must_require_human_review: boolean;
    allowed_files: number;
    forbidden_patterns: number;
    required_tests: number;
    must_preserve: number;
    reverse_issue_triggers: number;
  };
};

// ---------------------------------------------------------------------------
// Exporter Input
// ---------------------------------------------------------------------------

export type ScopedHandoffInput = {
  locale: "en" | "zh-CN";
  scopeLabel?: string;
  operatorId?: string;
  /** Project-specific forbidden patterns. .pantheon/** and .cursor/** are always included. */
  extraForbiddenPatterns?: string[];
};

// ---------------------------------------------------------------------------
// Protocol Constants
// ---------------------------------------------------------------------------

/** Forbidden patterns that are always included regardless of project type. */
export const PROTOCOL_FORBIDDEN_PATTERNS: ScopedFilePattern[] = [
  { pattern: ".pantheon/**", reason: "Pantheon protocol files must not be modified by downstream agents." },
  { pattern: ".cursor/**", reason: "Cursor adapter files must not be modified by downstream agents." },
];

/** Generic advice phrases forbidden in cursor rules output. */
export const FORBIDDEN_GENERIC_PHRASES = [
  "follow good architecture",
  "be careful",
  "keep code clean",
  "ensure quality",
  "use best practices",
  "maintain standards",
  "write clean code",
];

export const GENERATOR_VERSION = "p17.0";

/**
 * Valid issue types accepted by scripts/createImplementationIssue.ts.
 * P17 reverse issue triggers MUST only use these types.
 * Source of truth: scripts/createImplementationIssue.ts line 28-31
 */
export const VALID_REVERSE_ISSUE_TYPES = [
  "missing_field",
  "wrong_type",
  "missing_state",
  "wrong_transition",
  "missing_interface",
  "contract_mismatch",
  "acceptance_gap",
  "other",
] as const;
