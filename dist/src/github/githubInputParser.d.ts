import type { GitHubActionConfig, GitHubActionEvent, GitHubFailCondition, GitHubPullRequestContext, GitHubChangeInputs, GitHubRepairInputs } from "./githubActionTypes.js";
export declare function parseGitHubActionConfig(env: NodeJS.ProcessEnv): GitHubActionConfig;
export declare function loadGitHubEvent(env: NodeJS.ProcessEnv): GitHubActionEvent | null;
export declare function extractPullRequestContext(event: GitHubActionEvent | null): GitHubPullRequestContext | null;
export declare function parseMultilinePatterns(raw: string | undefined): string[];
export declare function parseFailConditions(raw: string | undefined, defaultConditions?: GitHubFailCondition[]): GitHubFailCondition[];
export declare function parseBoolean(raw: string | undefined, fallback: boolean): boolean;
export declare function parseGitHubChangeInputs(env: NodeJS.ProcessEnv): {
    inputs: GitHubChangeInputs;
    event: GitHubActionEvent | null;
    prContext: GitHubPullRequestContext | null;
};
export declare function parseGitHubRepairInputs(env: NodeJS.ProcessEnv): {
    inputs: GitHubRepairInputs;
    event: GitHubActionEvent | null;
    prContext: GitHubPullRequestContext | null;
};
export declare function parseChangeFailConditions(raw: string | undefined): GitHubFailCondition[];
export declare function parseRepairFailConditions(raw: string | undefined): GitHubFailCondition[];
/** @deprecated use parseMultilinePatterns */
export declare const parseDelimitedList: typeof parseMultilinePatterns;
