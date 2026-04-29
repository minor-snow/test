import type { GitHubActionConfig, GitHubActionEvent, GitHubFailCondition, GitHubPullRequestContext } from "./githubActionTypes.js";
export declare function parseGitHubActionConfig(env: NodeJS.ProcessEnv): GitHubActionConfig;
export declare function loadGitHubEvent(env: NodeJS.ProcessEnv): GitHubActionEvent | null;
export declare function extractPullRequestContext(event: GitHubActionEvent | null): GitHubPullRequestContext | null;
export declare function parseMultilinePatterns(raw: string | undefined): string[];
export declare function parseFailConditions(raw: string | undefined): GitHubFailCondition[];
export declare function parseBoolean(raw: string | undefined, fallback: boolean): boolean;
