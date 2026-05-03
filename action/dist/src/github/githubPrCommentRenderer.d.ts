import type { PantheonCheckPublic } from "../cli/types.js";
import type { GitHubRenderedComment, GitHubRenderedSummary } from "./githubActionTypes.js";
export declare const PANTHEON_COMMENT_MARKER = "<!-- pantheon-boundary-check-v0 -->";
export declare function renderGitHubPrComment(check: PantheonCheckPublic): GitHubRenderedComment;
export declare function renderGitHubStepSummary(check: PantheonCheckPublic, metadata?: {
    readonly baseSha?: string;
    readonly headSha?: string;
}): GitHubRenderedSummary;
