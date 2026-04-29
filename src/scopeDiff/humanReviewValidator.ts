/**
 * P18: Human Review Validator
 *
 * Validates human review requirements for high-risk scopes.
 *
 * ref: P18
 */

import type { ScopedImplementationBoundaryPackage } from "../scopedHandoff/types.js";
import type { HumanReviewInput, ScopeDiffViolation, ScopeDiffWarning } from "./types.js";

const MIN_RATIONALE_LENGTH = 20;

export function validateHumanReview(
  scope: ScopedImplementationBoundaryPackage,
  review?: HumanReviewInput,
): {
  violations: ScopeDiffViolation[];
  warnings: ScopeDiffWarning[];
} {
  const violations: ScopeDiffViolation[] = [];
  const warnings: ScopeDiffWarning[] = [];

  if (!scope.summary.must_require_human_review) {
    // Low/medium risk: review not required
    return { violations, warnings };
  }

  // High-risk: review IS required
  if (!review || !review.provided) {
    violations.push({
      violation_id: "v_human_review_missing",
      violation_type: "human_review_missing",
      severity: "high",
      message: `Human review is required for ${scope.summary.risk_level.toUpperCase()} risk scope.`,
      required_action: "Provide human review with reviewer_id and rationale before proceeding.",
      source: { scope_id: scope.scope_id, rule: "must_require_human_review = true" },
    });
    return { violations, warnings };
  }

  if (!review.reviewer_id || review.reviewer_id.trim().length === 0) {
    violations.push({
      violation_id: "v_human_review_no_reviewer",
      violation_type: "human_review_missing",
      severity: "high",
      message: "Human review provided but reviewer_id is missing.",
      required_action: "Provide reviewer_id with human review.",
      source: { scope_id: scope.scope_id },
    });
  }

  if (!review.rationale || review.rationale.trim().length === 0) {
    violations.push({
      violation_id: "v_human_review_no_rationale",
      violation_type: "human_review_missing",
      severity: "high",
      message: "Human review provided but rationale is missing.",
      required_action: "Provide rationale explaining why implementation is safe.",
      source: { scope_id: scope.scope_id },
    });
  } else if (review.rationale.trim().length < MIN_RATIONALE_LENGTH) {
    warnings.push({
      warning_id: "w_rationale_short",
      warning_type: "human_review_rationale_short",
      message: `Human review rationale is very short (${review.rationale.trim().length} chars, recommend ≥${MIN_RATIONALE_LENGTH}).`,
    });
  }

  return { violations, warnings };
}
