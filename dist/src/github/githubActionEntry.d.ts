import type { GitHubActionRunResult, GitHubRepairRunResult, GitHubChangeRunResult, GitHubGateRunResult } from "./githubActionTypes.js";
export declare function runGitHubAction(env?: NodeJS.ProcessEnv): Promise<GitHubActionRunResult>;
export declare function runGitHubWorkflowAction(env?: NodeJS.ProcessEnv): Promise<GitHubActionRunResult | GitHubRepairRunResult | GitHubChangeRunResult | GitHubGateRunResult>;
