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
import type { TrustedApprovalSummary } from "../policy/contractGateTypes.js";
/**
 * Resolve trusted approval from local audit decisions.
 * Only trusts decisions that were NOT in the current diff.
 */
export declare function resolveLocalTrustedApproval(input: {
    auditDecisions: readonly LocalAuditDecision[];
    changedPaths: readonly string[];
}): TrustedApprovalSummary;
/**
 * Resolve trusted approval from GitHub PR metadata.
 *
 * Trust criteria:
 *   1. GitHub review approval by non-PR-author with write+ permission
 *   2. CODEOWNERS approval (inferred from GitHub review metadata)
 *   3. Trusted label applied by actor with write+ permission
 */
export declare function resolveGitHubTrustedApproval(input: {
    reviews: readonly GitHubReviewInfo[];
    labels: readonly GitHubLabelInfo[];
    prAuthor: string;
    trustedLabels?: readonly string[];
}): TrustedApprovalSummary;
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
