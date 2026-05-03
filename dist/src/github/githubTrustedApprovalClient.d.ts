/**
 * P29.5: GitHub Trusted Approval Client
 *
 * Thin wrapper around GitHub REST API for fetching PR reviews and labels.
 * Used by trustedApprovalResolver to determine if trusted approval exists.
 *
 * API endpoints:
 *   - GET /repos/{owner}/{repo}/pulls/{number}/reviews
 *   - GET /repos/{owner}/{repo}/issues/{number}/labels
 *   - GET /repos/{owner}/{repo}/collaborators/{username}/permission
 *
 * Required permissions:
 *   - pull-requests: read
 *   - issues: read (labels are on the issues API)
 *
 * ref: P29.5 section 12
 */
import type { GitHubReviewInfo, GitHubLabelInfo } from "../trust/trustedApprovalResolver.js";
export declare function fetchPullRequestReviews(input: {
    owner: string;
    repo: string;
    prNumber: number;
    token: string;
    apiUrl?: string;
}): Promise<GitHubReviewInfo[]>;
export declare function fetchPullRequestLabels(input: {
    owner: string;
    repo: string;
    prNumber: number;
    token: string;
    apiUrl?: string;
}): Promise<GitHubLabelInfo[]>;
