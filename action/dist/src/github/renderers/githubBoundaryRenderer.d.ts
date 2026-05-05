import type { PantheonCheckPublic } from "../../cli/types.js";
import type { GitHubDisclosureLevel, GitHubRenderedComment, GitHubRenderedSummary } from "../githubActionTypes.js";
export declare const PANTHEON_BOUNDARY_CHECK_MARKER = "<!-- pantheon-boundary-check-v0 -->";
export declare function renderGitHubPrComment(check: PantheonCheckPublic, options?: {
    disclosure?: GitHubDisclosureLevel;
}): GitHubRenderedComment;
export declare function renderGitHubStepSummary(check: PantheonCheckPublic, metadata?: {
    readonly baseSha?: string;
    readonly headSha?: string;
}, options?: {
    disclosure?: GitHubDisclosureLevel;
}): GitHubRenderedSummary;
