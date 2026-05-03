import type { GitHubCommentOperationResult, GitHubPullRequestContext } from "./githubActionTypes.js";
export declare function postOrUpdatePantheonComment(input: {
    prContext: GitHubPullRequestContext | null;
    githubToken: string | undefined;
    marker: string;
    markdown: string;
    githubApiUrl?: string;
}): Promise<GitHubCommentOperationResult>;
