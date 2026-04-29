/**
 * P23: Agent Trial Types
 *
 * Types for the Pet Agent Protocol Usability Trial.
 * P23 prepares agent task packets, evaluates verification results,
 * and computes deterministic attempt comparisons.
 *
 * P23 does NOT invoke agents. It instruments the protocol boundary.
 */

// ---------------------------------------------------------------------------
// Scenario
// ---------------------------------------------------------------------------

export type PetTrialScenarioId =
  | "pet_out_of_scope_retry"
  | "pet_missing_test_retry"
  | "pet_compliant_baseline";

export type PetTrialScenario = {
  readonly id: PetTrialScenarioId;
  readonly description: string;
  readonly intent: string;
  readonly planned_changed_files: readonly string[];
  readonly expected_attempts: 1 | 2;
  /** Simulated diffs for automated testing (one per attempt). */
  readonly simulated_diffs: readonly SimulatedAttemptDiff[];
};

export type SimulatedAttemptDiff = {
  readonly attempt: number;
  readonly changed_files: readonly {
    readonly path: string;
    readonly status: "added" | "modified" | "deleted";
  }[];
  readonly description: string;
};

// ---------------------------------------------------------------------------
// Agent Task Packet
// ---------------------------------------------------------------------------

/**
 * What the agent receives before starting work.
 *
 * Design:
 *   - Attempt 1: no detailed feedback_contract. Only scope + stop conditions.
 *   - Attempt 2: includes previous agent_feedback.json reference.
 *   - JSON is authoritative; markdown is a projection.
 */
export type AgentTaskPacket = {
  readonly schema_version: "agent_task_packet.v1";
  readonly packet_id: string;
  readonly generated_at: string;
  readonly scenario_id: PetTrialScenarioId;
  readonly attempt: number;

  readonly intent: string;

  readonly scope: {
    readonly allowed_files: readonly string[];
    readonly forbidden_patterns: readonly string[];
    readonly required_tests: readonly string[];
  };

  readonly stop_conditions: readonly string[];

  readonly feedback_usage: {
    readonly feedback_file_expected: string;
    readonly rule: string;
  };

  readonly authority_rules: {
    readonly json_authoritative: boolean;
    readonly markdown_is_projection: boolean;
  };

  /** Only populated in attempt ≥ 2 */
  readonly previous_feedback_ref?: string;
};

// ---------------------------------------------------------------------------
// Trial Attempt
// ---------------------------------------------------------------------------

export type TrialAttempt = {
  readonly attempt_number: number;
  readonly started_at: string;

  readonly actual_diff: {
    readonly changed_files: readonly string[];
    readonly diff_source: "simulated" | "git_diff" | "manual";
  };

  readonly verification_verdict: string;
  readonly violation_count: number;
  readonly violations: readonly TrialViolationKey[];

  readonly feedback_generated: boolean;
  readonly feedback_verdict?: string;
};

// ---------------------------------------------------------------------------
// Violation Key (for cross-attempt matching)
// ---------------------------------------------------------------------------

/**
 * Cross-attempt violation matching key.
 *
 * Matching rule (deterministic):
 *   - Match by (kind, path) as primary key.
 *   - Use constraint_id as tiebreaker when same kind+path appears multiple times.
 *   - violation_id is attempt-local and MUST NOT be used for cross-attempt matching.
 */
export type TrialViolationKey = {
  readonly kind: string;
  readonly path?: string;
  readonly constraint_id?: string;
};

// ---------------------------------------------------------------------------
// Attempt Comparison
// ---------------------------------------------------------------------------

export type FeedbackEffect =
  | "improved"
  | "regressed"
  | "mixed"
  | "unchanged"
  | "unknown";

/**
 * Deterministic comparison between two attempts.
 *
 * feedback_effect derivation rules:
 *   improved:   resolved > 0  AND  new == 0  AND  verdict severity ≤ previous
 *   regressed:  new > 0       AND  resolved == 0
 *   mixed:      resolved > 0  AND  new > 0
 *   unchanged:  resolved == 0 AND  new == 0  AND  violation_count_delta == 0
 *               (if delta == 0 but key set changed → mixed)
 *   unknown:    missing feedback on either attempt
 *
 * Verdict severity order: pass < requires_review < requires_reverse_issue < fail
 */
export type AttemptComparison = {
  readonly from_attempt: number;
  readonly to_attempt: number;

  readonly verdict_from: string;
  readonly verdict_to: string;

  readonly violation_count_from: number;
  readonly violation_count_to: number;
  readonly violation_count_delta: number;

  readonly resolved_violations: readonly TrialViolationKey[];
  readonly new_violations: readonly TrialViolationKey[];
  readonly persisted_violations: readonly TrialViolationKey[];

  readonly feedback_effect: FeedbackEffect;
};

// ---------------------------------------------------------------------------
// Protocol Gap
// ---------------------------------------------------------------------------

/**
 * Structured protocol gap observation.
 *
 * Auto-generated kinds:
 *   - feedback_ambiguous: attempt regressed after feedback
 *   - feedback_ignored: attempt unchanged with remaining violations
 *
 * Human-observer-only kinds:
 *   - agent_overfit_to_markdown: cannot be inferred from diff/feedback alone
 */
export type ProtocolGapKind =
  | "scope_not_followed"
  | "feedback_ignored"
  | "feedback_ambiguous"
  | "agent_modified_governance_artifact"
  | "agent_overfit_to_markdown"
  | "missing_instruction"
  | "other";

export type ProtocolGap = {
  readonly kind: ProtocolGapKind;
  readonly evidence: string;
  readonly related_attempt?: number;
  readonly suggested_change?: string;
};

// ---------------------------------------------------------------------------
// Trial Report
// ---------------------------------------------------------------------------

export type AgentTrialReport = {
  readonly schema_version: "agent_trial_report.v1";
  readonly trial_id: string;
  readonly generated_at: string;
  readonly packet_hash?: string;

  readonly fixture_context: {
    readonly repo_kind: "controlled_fixture" | "real_repo";
    readonly file_count: number;
    readonly source_file_count: number;
    readonly test_file_count: number;
    readonly known_limitations: readonly string[];
  };

  readonly base_repo_state: {
    readonly head_commit_hash: string | null;
    readonly has_uncommitted_changes: boolean | null;
    readonly observation_hash: string;
  };

  readonly scenario: {
    readonly id: PetTrialScenarioId;
    readonly description: string;
    readonly intent: string;
  };

  readonly attempts: readonly TrialAttempt[];
  readonly comparisons: readonly AttemptComparison[];

  readonly final: {
    readonly verdict: string;
    readonly agent_followed_scope: boolean;
    readonly agent_used_feedback: true | false | "unknown";
    readonly feedback_effect: FeedbackEffect;
    readonly protocol_gaps_observed: readonly ProtocolGap[];
    readonly recommended_protocol_changes: readonly string[];
  };
};
