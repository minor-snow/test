import type { GitHubDisclosureLevel, GitHubRenderedComment, GitHubRenderedSummary, GitHubRepairRunResult } from "../githubActionTypes.js";
export declare const PANTHEON_REPAIR_COMMENT_MARKER = "<!-- pantheon-repair-gate-v0 -->";
export declare function renderGitHubRepairComment(result: GitHubRepairRunResult, options?: {
    disclosure?: GitHubDisclosureLevel;
}): GitHubRenderedComment;
export declare function renderGitHubRepairStepSummary(result: GitHubRepairRunResult, options?: {
    disclosure?: GitHubDisclosureLevel;
}): GitHubRenderedSummary;
