import type { ChangeCheckResult } from "../../change/types.js";
import type { GitHubDisclosureLevel, GitHubRenderedComment, GitHubRenderedSummary } from "../githubActionTypes.js";
export declare const PANTHEON_CHANGE_COMMENT_MARKER = "<!-- pantheon_change_governance_comment -->";
export declare function renderChangePrComment(check: ChangeCheckResult, context?: {
    baseSha?: string;
    headSha?: string;
    type?: string;
}, options?: {
    disclosure?: GitHubDisclosureLevel;
}): GitHubRenderedComment;
export declare function renderChangeStepSummary(check: ChangeCheckResult, context: {
    baseSha?: string;
    headSha?: string;
    type?: string;
}, options?: {
    disclosure?: GitHubDisclosureLevel;
}): GitHubRenderedSummary;
