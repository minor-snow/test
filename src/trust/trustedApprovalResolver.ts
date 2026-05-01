/**
 * P29.5: Trusted Approval Resolver
 *
 * Abstract interface and local implementation for resolving trusted approvals.
 * A "trusted approval" is an external signal (not PR-authored) that satisfies
 * governance requirements.
 *
 * Trust rules:
 *   - PR author approving their own PR is NOT trusted.
 *   - Actor must have write+ permission.
 *   - Source must be external to PR file content (GitHub review, label, etc).
 *   - If permission is unknown → not trusted (fail-closed).
 *
 * ref: P29.5 section 12, implementation guard #6
 */

import type { TrustedApprovalSummary, TrustedApprovalSource } from "../policy/contractGateTypes.js";

// ---------------------------------------------------------------------------
// Public API — Local resolution
// ---------------------------------------------------------------------------

/**
 * Resolve trusted approval from local audit decisions.
 * Only trusts decisions that were NOT in the current diff.
 */
export function resolveLocalTrustedApproval(input: {
  auditDecisions: readonly LocalAuditDecision[];
  changedPaths: readonly string[];
}): TrustedApprovalSummary {
  const { auditDecisions, changedPaths } = input;

  // Filter out audit decisions whose files were modified in this diff
  const trustedDecisions = auditDecisions.filter(d =>
    !changedPaths.includes(d.filePath),
  );

  if (trustedDecisions.length === 0) {
    return { trusted: false, source: "none" };
  }

  // Use the most recent trusted decision
  const latest = trustedDecisions.sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  )[0];

  return {
    trusted: true,
    source: "local_audit",
    actor: latest.operatorId,
    approved_at: latest.createdAt,
  };
}

// ---------------------------------------------------------------------------
// Public API — GitHub resolution
// ---------------------------------------------------------------------------

/**
 * Resolve trusted approval from GitHub PR metadata.
 *
 * Trust criteria:
 *   1. GitHub review approval by non-PR-author with write+ permission
 *   2. CODEOWNERS approval (inferred from GitHub review metadata)
 *   3. Trusted label applied by actor with write+ permission
 */
export function resolveGitHubTrustedApproval(input: {
  reviews: readonly GitHubReviewInfo[];
  labels: readonly GitHubLabelInfo[];
  prAuthor: string;
  trustedLabels?: readonly string[];
}): TrustedApprovalSummary {
  const { reviews, labels, prAuthor, trustedLabels } = input;

  // Check for approving review by non-PR-author with sufficient permission
  const approvingReviews = reviews.filter(r =>
    r.state === "APPROVED"
    && r.author !== prAuthor
    && hasWritePermission(r.authorPermission),
  );

  if (approvingReviews.length > 0) {
    const latest = approvingReviews.sort((a, b) =>
      b.submittedAt.localeCompare(a.submittedAt),
    )[0];

    return {
      trusted: true,
      source: "github_review",
      actor: latest.author,
      permission: latest.authorPermission,
      approved_at: latest.submittedAt,
    };
  }

  // Check for trusted labels
  const allowedLabels = trustedLabels ?? ["pantheon-approved", "contract-approved"];
  const trustedLabel = labels.find(l =>
    allowedLabels.includes(l.name)
    && l.appliedBy !== prAuthor
    && hasWritePermission(l.appliedByPermission),
  );

  if (trustedLabel) {
    return {
      trusted: true,
      source: "maintainer_label",
      actor: trustedLabel.appliedBy,
      permission: trustedLabel.appliedByPermission,
      approved_at: trustedLabel.appliedAt,
    };
  }

  // No trusted approval found
  return { trusted: false, source: "none" };
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LocalAuditDecision = {
  readonly filePath: string;
  readonly operatorId: string;
  readonly decision: string;
  readonly createdAt: string;
};

export type GitHubReviewInfo = {
  readonly author: string;
  readonly authorPermission: TrustedApprovalSummary["permission"];
  readonly state: "APPROVED" | "CHANGES_REQUESTED" | "COMMENTED" | "DISMISSED" | "PENDING";
  readonly submittedAt: string;
};

export type GitHubLabelInfo = {
  readonly name: string;
  readonly appliedBy: string;
  readonly appliedByPermission?: TrustedApprovalSummary["permission"];
  readonly appliedAt?: string;
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function hasWritePermission(
  permission: TrustedApprovalSummary["permission"],
): boolean {
  if (!permission) return false;
  return permission === "write" || permission === "maintain" || permission === "admin";
}
